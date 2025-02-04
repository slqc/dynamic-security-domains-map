const width = window.innerWidth;
const height = window.innerHeight * 0.8;

// Select the SVG element and set its dimensions
const svg = d3.select("#graph")
    .attr("width", width)
    .attr("height", height);

// Initialize the force simulation
const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(100)) // Define link distance
    .force("charge", d3.forceManyBody().strength(-200)) // Repel nodes from each other
    .force("center", d3.forceCenter(width / 2, height / 2)); // Center the graph

// Function to load and render the graph
function loadGraph() {
    d3.json("cybersecurity-domains.json").then(data => {
        const nodes = [];
        const links = [];

        // Recursively traverse the JSON to extract nodes and links
        function traverse(node, parent = null) {
            nodes.push(node);
            if (parent) links.push({ source: parent, target: node });
            if (node.children) node.children.forEach(child => traverse(child, node));
        }
        traverse(data);

        // Draw links (lines connecting nodes)
        const link = svg.selectAll(".link")
            .data(links)
            .enter().append("line")
            .attr("class", "link")
            .attr("stroke", "#999");

        // Draw nodes (groups containing rectangle and text)
        const node = svg.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Append rounded rectangles to represent nodes
        node.append("rect")
            .attr("width", d => d.name.length * 10 + 20) // Adjust width based on text length
            .attr("height", 30)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", (d, i) => d3.schemeCategory10[i % 10]); // Assign colors to main categories

        // Append text labels inside nodes
        node.append("text")
            .attr("dy", 20)
            .attr("dx", 10)
            .text(d => d.name);

        // Apply force simulation to nodes and links
        simulation.nodes(nodes).on("tick", ticked);
        simulation.force("link").links(links);

        // Function to update node and link positions on each simulation tick
        function ticked() {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x},${d.y})`);
        }
    });
}

// Drag event functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

// Reset button functionality - clears the graph and reloads it
document.getElementById("reset").addEventListener("click", () => {
    svg.selectAll("*").remove(); // Remove existing elements
    loadGraph(); // Reload the graph with new randomized parameters
});

// Load the graph on page load
loadGraph();
