// Global state
let treeData,
    instanceData,
    scatterData,
    hierarchyRoot,
    svg,
    contentGroup,
    tooltip;
let currentMode = "blocks"; // 'classic' or 'blocks'

// Initialize visualization
async function init() {
    try {
        [treeData, instanceData, scatterData] = await Promise.all([
            d3.json("data/tree_adult5_500_originalDataset_no.json"),
            d3.json("data/adult5_instance.json"),
            d3
                .json("data/scatter_adult5_500_originalDataset_no.json")
                .catch(() => null),
        ]);

        hierarchyRoot = buildHierarchy(treeData);
        setupButtons();
        createVisualization();
    } catch (error) {
        console.error("Error loading data:", error);
    }
}

// Setup button handlers
function setupButtons() {
    d3.select("#btn-classic").on("click", () => switchMode("classic"));
    d3.select("#btn-blocks").on("click", () => switchMode("blocks"));
}

// Switch between visualization modes
function switchMode(mode) {
    if (mode === currentMode) return;

    currentMode = mode;
    d3.selectAll(".btn").classed("active", false);
    d3.select(`#btn-${mode}`).classed("active", true);

    createVisualization();
}

// Create the tree visualization
function createVisualization() {
    d3.select("#tree-container").selectAll("*").remove();

    tooltip = d3.select(".tooltip");

    if (currentMode === "classic") {
        svg = d3
            .select("#tree-container")
            .append("svg")
            .attr("width", CONFIG.width)
            .attr("height", CONFIG.height);

        contentGroup = svg
            .append("g")
            .attr(
                "transform",
                `translate(${CONFIG.margin.left},${CONFIG.margin.top})`
            );

        renderClassicalTree();
        setupZoom("classic");
    } else {
        // For blocks tree, we need to calculate dimensions first
        const allPaths = getAllPaths(hierarchyRoot);
        const instancePath = instanceData
            ? findInstancePath(hierarchyRoot, instanceData)
            : allPaths[0] || [];
        const metrics = calculateBlocksMetrics(allPaths);
        const layout = depthAlignedLayout(allPaths, instancePath, metrics);

        svg = d3
            .select("#tree-container")
            .append("svg")
            .attr("width", CONFIG.width)
            .attr("height", CONFIG.height)
            .attr("viewBox", `0 0 ${layout.width} ${layout.height}`)
            .attr("preserveAspectRatio", "xMidYMid meet");

        contentGroup = svg.append("g");

        renderBlocksTree();
        setupZoom("blocks");
    }
}

// Setup zoom behavior
function setupZoom(mode) {
    const zoom = d3
        .zoom()
        .scaleExtent([0.5, 20])
        .on("zoom", (event) => {
            if (mode === "classic") {
                contentGroup.attr(
                    "transform",
                    `translate(${CONFIG.margin.left + event.transform.x},${
                        CONFIG.margin.top + event.transform.y
                    }) scale(${event.transform.k})`
                );
            } else {
                contentGroup.attr("transform", event.transform);
            }
        });

    svg.call(zoom);
}

// Start the application
init();
