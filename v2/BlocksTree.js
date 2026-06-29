// Blocks tree visualization

// Calculate positions for depth-aligned layout
function depthAlignedLayout(allPaths, instancePath, metrics) {
    const positions = {};

    const effectiveWidth = Math.max(CONFIG.width, metrics.requiredWidth);
    const effectiveHeight = Math.max(CONFIG.height, metrics.requiredHeight);

    const margin = {
        top: CONFIG.margin.top * metrics.nodeScaleFactor,
        right: CONFIG.margin.right * metrics.nodeScaleFactor,
        bottom: CONFIG.margin.bottom * metrics.nodeScaleFactor,
        left: CONFIG.margin.left * metrics.nodeScaleFactor,
    };

    const availableWidth = effectiveWidth - margin.left - margin.right;
    const availableHeight = effectiveHeight - margin.top - margin.bottom;

    // Calculate X positions for each depth
    const depthToX = {};
    for (let depth = 0; depth <= metrics.maxDepth; depth++) {
        depthToX[depth] =
            margin.left +
            (metrics.maxDepth === 0
                ? 0
                : depth * (availableWidth / metrics.maxDepth));
    }

    // Place instance path at bottom
    const bottomY = effectiveHeight - margin.bottom;
    instancePath.forEach((nodeId, depth) => {
        positions[nodeId] = {
            id: nodeId,
            x: depthToX[depth],
            y: bottomY,
            label: getNodeLabelById(nodeId),
        };
    });

    // Place other paths above
    const otherPaths = allPaths.filter((p) => !arraysEqual(p, instancePath));
    const sortedOtherPaths = otherPaths.sort(
        (a, b) =>
            findBranchPoint(a, instancePath) - findBranchPoint(b, instancePath)
    );

    const availableSpaceAbove = availableHeight - margin.bottom * 2;
    const pathSpacing = Math.max(
        metrics.nodeSpacing,
        availableSpaceAbove / Math.max(1, sortedOtherPaths.length)
    );

    sortedOtherPaths.forEach((path, idx) => {
        const y = margin.top + idx * pathSpacing;
        path.forEach((nodeId, depth) => {
            if (!positions[nodeId]) {
                positions[nodeId] = {
                    id: nodeId,
                    x: depthToX[depth],
                    y,
                    label: getNodeLabelById(nodeId),
                };
            }
        });
    });

    return { positions, width: effectiveWidth, height: effectiveHeight };
}

// Main blocks tree render function
function renderBlocksTree() {
    const allPaths = getAllPaths(hierarchyRoot);
    const instancePath = instanceData
        ? findInstancePath(hierarchyRoot, instanceData)
        : allPaths[0] || [];
    const metrics = calculateBlocksMetrics(allPaths);
    const layout = depthAlignedLayout(allPaths, instancePath, metrics);

    // Update SVG viewBox
    svg.attr("viewBox", `0 0 ${layout.width} ${layout.height}`).attr(
        "preserveAspectRatio",
        "xMidYMid meet"
    );

    contentGroup.attr("transform", "");

    // Render nodes first
    renderBlocksNodes(layout.positions, metrics);

    // Render links after nodes
    setTimeout(() => {
        renderBlocksLinks(allPaths, layout.positions, metrics);
    }, CONFIG.transition.stagger);
}

// Render nodes for blocks layout
function renderBlocksNodes(nodePositions, metrics) {
    const nodeData = Object.values(nodePositions);

    const nodes = contentGroup
        .selectAll(".node")
        .data(nodeData, (d) => d.id)
        .join("g")
        .attr("class", "node")
        .attr("transform", (d) => `translate(${d.x},${d.y})`)
        .style("opacity", 0);

    nodes
        .append("rect")
        .attr("x", -CONFIG.node.rectWidth / 2)
        .attr("y", -CONFIG.node.rectHeight / 2)
        .attr("width", CONFIG.node.rectWidth)
        .attr("height", CONFIG.node.rectHeight)
        .attr("rx", CONFIG.node.borderRadius)
        .style("fill", (d) => {
            const nd = treeData.find((n) => n.node_id === d.id);
            return getNodeColor(nd);
        })
        .style("stroke", CONFIG.colors.nodeStroke)
        .style(
            "stroke-width",
            `${metrics?.nodeStrokeWidth || CONFIG.node.strokeWidth}px`
        )
        .on("mouseover", (event, d) => {
            const nd = treeData.find((n) => n.node_id === d.id);
            showNodeTooltip(event, nd);
        })
        .on("mousemove", (event) => moveTooltip(event))
        .on("mouseout", () => hideTooltip());

    // Add labels
    nodes.each(function (d) {
        const nd = treeData.find((n) => n.node_id === d.id);
        const label = getNodeLabelForDisplay(nd);
        const lines = label.split("\n");
        const fontSize = Math.min(
            14,
            80 / Math.max(...lines.map((l) => l.length))
        );

        lines.forEach((line, i) => {
            d3.select(this)
                .append("text")
                .attr("class", "node-label")
                .attr("y", (i - (lines.length - 1) / 2) * fontSize * 1.2)
                .style("font-size", `${fontSize}px`)
                .text(line);
        });
    });

    nodes
        .raise() // Ensure nodes are on top
        .transition()
        .duration(CONFIG.transition.shapeMorph)
        .style("opacity", 1);
}

// Render links for blocks layout
function renderBlocksLinks(allPaths, nodePositions, metrics) {
    // Create links
    const links = [];
    const linkSet = new Set();

    allPaths.forEach((path) => {
        for (let i = 0; i < path.length - 1; i++) {
            const key = `${path[i]}-${path[i + 1]}`;
            if (!linkSet.has(key)) {
                linkSet.add(key);
                links.push({
                    source: nodePositions[path[i]],
                    target: nodePositions[path[i + 1]],
                    sourceId: path[i],
                    targetId: path[i + 1],
                });
            }
        }
    });

    const totalSamples = treeData[0].n_samples;

    const linkElements = contentGroup
        .selectAll(".link")
        .data(links, (d) => `${d.sourceId}-${d.targetId}`)
        .join("line")
        .attr("class", "link")
        .attr("x1", (d) => d.source.x)
        .attr("y1", (d) => d.source.y)
        .attr("x2", (d) => d.target.x)
        .attr("y2", (d) => d.target.y)
        .style("stroke", (d) => {
            const sourceNode = treeData.find((n) => n.node_id === d.sourceId);
            return getLinkColor({ data: sourceNode }, d.targetId);
        })
        .style("stroke-width", (d) => {
            const targetNode = treeData.find((n) => n.node_id === d.targetId);
            const samples =
                targetNode.weighted_n_samples || targetNode.n_samples;
            return getStrokeWidth(samples, totalSamples) + "px";
        })
        .style("opacity", 0)
        .on("mouseover", (event, d) => showBlocksLinkTooltip(event, d))
        .on("mousemove", (event) => moveTooltip(event))
        .on("mouseout", () => hideTooltip());

    linkElements
        .lower() // Push links behind nodes
        .transition()
        .duration(CONFIG.transition.linkFade)
        .style("opacity", 1);
}
