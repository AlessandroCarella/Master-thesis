// Convert flat structure to hierarchical
function createHierarchy(data) {
    const nodesById = {};
    data.forEach(node => {
        nodesById[node.node_id] = { ...node, children: [] };
    });

    const root = nodesById[0];
    data.forEach(node => {
        if (node.left_child !== null) {
            nodesById[node.node_id].children.push(nodesById[node.left_child]);
        }
        if (node.right_child !== null) {
            nodesById[node.node_id].children.push(nodesById[node.right_child]);
        }
    });

    return root;
}

// Create the visualization
function createVisualization(rawTreeData) {
    // Set up dimensions
    const margin = { top: 90, right: 30, bottom: 90, left: 90 };
    const width = 1200 - margin.left - margin.right;
    const height = 900 - margin.top - margin.bottom;

    // Clear any existing SVG
    d3.select("#visualization svg").remove();

    // Create SVG container
    const svg = d3.select("#visualization")
        .append("svg")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom)
        .append("g")
        .attr("transform", `translate(${margin.left},${margin.top})`);

    // Create tree layout - switched dimensions for vertical layout
    const treeLayout = d3.tree().size([width, height]);

    // Convert the data to hierarchy
    const root = d3.hierarchy(createHierarchy(rawTreeData));

    // Generate tree layout
    const treeData = treeLayout(root);

    // Add links
    const links = svg.selectAll(".link")
        .data(treeData.links())
        .enter()
        .append("path")
        .attr("class", "link")
        .attr("d", d3.linkVertical()
            .x(d => d.x)
            .y(d => d.y));

    // Create nodes
    const nodes = svg.selectAll(".node")
        .data(treeData.descendants())
        .enter()
        .append("g")
        .attr("class", "node")
        .attr("transform", d => `translate(${d.x},${d.y})`);

    // Add circles to nodes
    nodes.append("circle")
        .attr("r", 10)
        .style("fill", d => {
            if (d.data.is_leaf) {
                switch (d.data.class_label) {
                    case "setosa": return "#4CAF50";
                    case "versicolor": return "#2196F3";
                    case "virginica": return "#9C27B0";
                    default: return "#FFA726";
                }
            }
            return "#FFA726";
        });

    // Add labels to nodes
    nodes.append("text")
        .attr("dy", "-1.2em")
        .attr("x", 0)
        .style("text-anchor", "middle")
        .text(d => {
            if (d.data.is_leaf) {
                return `${d.data.class_label} (${d.data.samples})`;
            }
            return `${d.data.feature_name}`;
        });

    // Add threshold values below feature names
    nodes.filter(d => !d.data.is_leaf)
        .append("text")
        .attr("dy", "0em")
        .attr("x", 0)
        .style("text-anchor", "middle")
        .text(d => `≤ ${d.data.threshold.toFixed(2)}`);

    // Add sample count below nodes for non-leaf nodes
    nodes.filter(d => !d.data.is_leaf)
        .append("text")
        .attr("dy", "1.2em")
        .attr("x", 0)
        .style("text-anchor", "middle")
        .text(d => `samples = ${d.data.samples}`);
}

// Tree data structure
const rawTreeData = [
    {"node_id":0,"feature_name":"petal length (cm)","threshold":2.449999988079071,"left_child":1,"right_child":2,"is_leaf":false,"class_label":null,"samples":105},
    {"node_id":1,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"setosa","samples":31},
    {"node_id":2,"feature_name":"petal length (cm)","threshold":4.75,"left_child":3,"right_child":6,"is_leaf":false,"class_label":null,"samples":74},
    {"node_id":3,"feature_name":"petal width (cm)","threshold":1.600000023841858,"left_child":4,"right_child":5,"is_leaf":false,"class_label":null,"samples":33},
    {"node_id":4,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"versicolor","samples":32},
    {"node_id":5,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"virginica","samples":1},
    {"node_id":6,"feature_name":"petal width (cm)","threshold":1.75,"left_child":7,"right_child":14,"is_leaf":false,"class_label":null,"samples":41},
    {"node_id":7,"feature_name":"petal length (cm)","threshold":4.950000047683716,"left_child":8,"right_child":9,"is_leaf":false,"class_label":null,"samples":8},
    {"node_id":8,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"versicolor","samples":2},
    {"node_id":9,"feature_name":"petal width (cm)","threshold":1.550000011920929,"left_child":10,"right_child":11,"is_leaf":false,"class_label":null,"samples":6},
    {"node_id":10,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"virginica","samples":3},
    {"node_id":11,"feature_name":"petal length (cm)","threshold":5.450000047683716,"left_child":12,"right_child":13,"is_leaf":false,"class_label":null,"samples":3},
    {"node_id":12,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"versicolor","samples":2},
    {"node_id":13,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"virginica","samples":1},
    {"node_id":14,"feature_name":"petal length (cm)","threshold":4.8500001430511475,"left_child":15,"right_child":18,"is_leaf":false,"class_label":null,"samples":33},
    {"node_id":15,"feature_name":"sepal width (cm)","threshold":3.100000023841858,"left_child":16,"right_child":17,"is_leaf":false,"class_label":null,"samples":3},
    {"node_id":16,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"virginica","samples":2},
    {"node_id":17,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"versicolor","samples":1},
    {"node_id":18,"feature_name":null,"threshold":null,"left_child":null,"right_child":null,"is_leaf":true,"class_label":"virginica","samples":30}
];

// Initialize visualization when the page loads
document.addEventListener("DOMContentLoaded", () => createVisualization(rawTreeData));