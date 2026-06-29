// Classical tree visualization
function renderClassicalTree() {
    const tree = d3
        .tree()
        .size([
            CONFIG.width - CONFIG.margin.left - CONFIG.margin.right,
            CONFIG.height - CONFIG.margin.top - CONFIG.margin.bottom,
        ]);

    const root = d3.hierarchy(hierarchyRoot);
    tree(root);

    const totalSamples = treeData[0].n_samples;

    // Render links
    const links = contentGroup
        .selectAll(".link")
        .data(
            root.links(),
            (d) => `${d.source.data.node_id}-${d.target.data.node_id}`
        )
        .join(
            (enter) =>
                enter
                    .append("path")
                    .attr("class", "link")
                    .attr("d", (d) =>
                        createCurvedPath(
                            { x: d.source.x, y: d.source.y },
                            { x: d.target.x, y: d.target.y }
                        )
                    )
                    .style("stroke", (d) =>
                        getLinkColor(d.source, d.target.data.node_id)
                    )
                    .style("stroke-width", (d) => {
                        const samples =
                            d.target.data.weighted_n_samples ||
                            d.target.data.n_samples;
                        return getStrokeWidth(samples, totalSamples) + "px";
                    })
                    .style("opacity", 0)
                    .on("mouseover", (event, d) => showLinkTooltip(event, d))
                    .on("mousemove", (event) => moveTooltip(event))
                    .on("mouseout", () => hideTooltip()),
            (update) =>
                update
                    .transition()
                    .duration(CONFIG.transition.linkFade)
                    .attr("d", (d) =>
                        createCurvedPath(
                            { x: d.source.x, y: d.source.y },
                            { x: d.target.x, y: d.target.y }
                        )
                    )
                    .style("stroke", (d) =>
                        getLinkColor(d.source, d.target.data.node_id)
                    ),
            (exit) =>
                exit
                    .transition()
                    .duration(CONFIG.transition.linkFade)
                    .style("opacity", 0)
                    .remove()
        );

    links.transition().duration(CONFIG.transition.linkFade).style("opacity", 1);

    // Render nodes
    const nodes = contentGroup
        .selectAll(".node")
        .data(root.descendants(), (d) => d.data.node_id)
        .join(
            (enter) => {
                const nodeEnter = enter
                    .append("g")
                    .attr("class", "node")
                    .attr("transform", (d) => `translate(${d.x},${d.y})`)
                    .style("opacity", 0);

                nodeEnter
                    .append("circle")
                    .attr("r", CONFIG.node.radius)
                    .style("fill", (d) => getNodeColor(d.data))
                    .style("stroke", CONFIG.colors.nodeStroke)
                    .style("stroke-width", (d) => {
                        const samples =
                            d.data.weighted_n_samples || d.data.n_samples;
                        return getStrokeWidth(samples, totalSamples) + "px";
                    })
                    .on("mouseover", (event, d) =>
                        showNodeTooltip(event, d.data)
                    )
                    .on("mousemove", (event) => moveTooltip(event))
                    .on("mouseout", () => hideTooltip());

                // Add label
                nodeEnter
                    .append("text")
                    .attr("class", "node-label")
                    .attr("dy", CONFIG.node.radius + 15)
                    .style("font-size", "11px")
                    .text((d) => {
                        if (d.data.is_leaf) {
                            return `Class ${d.data.class_label}`;
                        }
                        return `${
                            d.data.feature_name
                        } ≤ ${d.data.threshold.toFixed(2)}`;
                    });

                return nodeEnter;
            },
            (update) =>
                update
                    .transition()
                    .duration(CONFIG.transition.position)
                    .attr("transform", (d) => `translate(${d.x},${d.y})`),
            (exit) =>
                exit
                    .transition()
                    .duration(CONFIG.transition.position)
                    .style("opacity", 0)
                    .remove()
        );

    nodes.transition().duration(CONFIG.transition.position).style("opacity", 1);

    // Highlight instance path if available
    setTimeout(() => highlightInstancePath(tree), CONFIG.transition.position);
}

// Highlight instance path (classic mode only)
function highlightInstancePath(tree) {
    if (!instanceData || currentMode !== "classic") return;

    const path = findInstancePath(hierarchyRoot, instanceData);
    if (!path || path.length < 2) return;

    const linkPairs = path.slice(0, -1).map((source, i) => ({
        source,
        target: path[i + 1],
    }));

    contentGroup
        .selectAll(".link")
        .filter(function (d) {
            const sourceId = d.source.data.node_id;
            const targetId = d.target.data.node_id;
            return linkPairs.some(
                (pair) => pair.source === sourceId && pair.target === targetId
            );
        })
        .each(function (d) {
            const pathD = d3.select(this).attr("d");
            const strokeWidth = parseFloat(
                d3.select(this).style("stroke-width")
            );

            contentGroup
                .append("path")
                .attr("class", "link-highlight")
                .attr("d", pathD)
                .style("stroke", CONFIG.colors.pathHighlight)
                .style("stroke-width", strokeWidth * 3 + "px")
                .style("fill", "none")
                .style("opacity", 0)
                .lower()
                .transition()
                .duration(CONFIG.transition.linkFade)
                .style("opacity", 0.6);
        });
}
