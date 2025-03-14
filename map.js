const controls = d3.select("body").append("div").attr("id", "controls");

controls.append("label").text("Force Strength: ");
controls.append("input")
    .attr("type", "range")
    .attr("min", -500)
    .attr("max", 0)
    .attr("value", -300)
    .attr("id", "forceStrength");

controls.append("label").text(" Link Distance: ");
controls.append("input")
    .attr("type", "range")
    .attr("min", 50)
    .attr("max", 300)
    .attr("value", 150)
    .attr("id", "linkDistance");

const width = window.innerWidth;
const height = window.innerHeight * 0.8;
const NODE_MAX_LINE_LENGTH = 20;

// Select the SVG element and set its dimensions
const svg = d3.select("#graph")
    .attr("width", width)
    .attr("height", height);

// Add a zoomable group to the SVG
d3.select("#graph").call(d3.zoom()
        .scaleExtent([0.5, 3]) // Set zoom scale limits
        .on("zoom", (event) => {
            g.attr("transform", event.transform); // Apply zoom transformations
        }));
const g = svg.append("g"); // Create a group for the graph elements

// Initialize the force simulation
const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(100)) // Define link distance
    .force("charge", d3.forceManyBody().strength(-500)) // Repel nodes from each other
    .force("center", d3.forceCenter(width / 2, height / 2)); // Center the graph
    //.force("collision", d3.forceCollide().radius(d => d.width / 2 ).iterations(1))

// Function to load and render the graph
function loadGraph() {
    d3.json("cybersecurity-domains.json").then(data => {
        const nodes = [];
        const links = [];

        // Recursively traverse the JSON to extract nodes and links
        function traverse(node, parent = null) {
            node.width = Math.max(100, node.name.length * 5 + 52); // Store width
            node.height = node.name.length > NODE_MAX_LINE_LENGTH ? 50 : 30; // Store height
            nodes.push(node);
            if (parent) links.push({ source: parent, target: node });
            if (node.children) node.children.forEach(child => traverse(child, node));
        }
        traverse(data);

        // Draw links (lines connecting nodes)
        const link = g.selectAll(".link")
            .data(links)
            .enter().append("line")
            .attr("class", "link")
            .attr("stroke", "#999");

        // Draw nodes (groups containing rectangle and text)
            // select from .node group -> should be empty
            //  each item in nodes will be used to create an element in the DOM.
            // .enter() handles new data that has no corresponding DOM element yet. 
            // .append("g") creates a new <g> (group) element for each node in nodes.
            // A <g> element acts as a container for multiple child elements (like a rectangle and text).
            // This allows you to transform the entire node (rectangle and text) as one unit.
            // Adds the class "node" to each newly created <g> element.
            // Applies drag behavior to each node.

        const node = g.selectAll(".node")
            .data(nodes)
            .enter().append("g")
            .attr("class", "node")
            .call(d3.drag()
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended));

        // Append rounded rectangles to represent nodes
        node.append("rect")
            //.attr("width", d => d.name.length * 10 + 20) // Adjust width based on text length
            .attr("width",  d => d.width) // Ensure a minimum width
            .attr("height", d => d.height) // Increase height if split
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("fill", (d, i) => d3.schemeCategory10[i % 10]); // Assign colors to main categories

        // Append text labels inside nodes
        /*node.append("text")
            .attr("dy", 20)
            .attr("dx", d => (d.name.length * 5))
            .text(d => d.name);*/

        node.each(function(d) {
            const textGroup = d3.select(this); // Select current node group
            const lineSpacing = 14; // Spacing for multi-line text

            if (d.name.length > NODE_MAX_LINE_LENGTH) { // If the text is too long, split it
                const words = d.name.split(" "); // Split by spaces
                const mid = Math.ceil(words.length / 2); // Find the middle
                const firstLine = words.slice(0, mid).join(" ");
                const secondLine = words.slice(mid).join(" ");

                textGroup.append("text")
                    .attr("dy", d.height / 2 - lineSpacing)
                    .attr("dx", d.width / 2)
                    .attr("text-anchor", "middle")
                    .text(firstLine);

                textGroup.append("text")
                    .attr("dy", d.height / 2)
                    .attr("dx", d.width / 2)
                    .attr("text-anchor", "middle")
                    .text(secondLine);
            } else {
                textGroup.append("text")
                    .attr("dy", d.height / 2)
                    .attr("dx", d.width / 2)
                    .attr("text-anchor", "middle")
                    .text(d.name);
            }
        });

        /*
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
        */

        // Apply force simulation to nodes and links
        simulation.nodes(nodes).on("tick", function() {
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x - d.width / 2},${d.y - d.height / 2})`);
        });

        simulation.force("link").links(links);      
    });
}

// Drag event functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}

function dragged(event, d) {
    const dx = event.x - d.fx;
    const dy = event.y - d.fy;
    
    d.fx = event.x;
    d.fy = event.y;
    
    function adjustChildren(node, dx, dy) {
        if (node.children) {
            node.children.forEach(child => {
                child.fx = (child.fx ?? child.x) + dx;
                child.fy = (child.fy ?? child.y) + dy;
                adjustChildren(child, dx, dy);
            });
        }
    }
    adjustChildren(d, dx, dy);
}


function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    d.fx = null;
    d.fy = null;
}

/*function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();

    function repositionChildren(node) {
        if (node.children) {
            node.children.forEach((child, index) => {
                // Apply a small force to spread children apart
                const angle = (index / node.children.length) * 2 * Math.PI; // Distribute in a circular pattern
                const distance = 50 + Math.random() * 50; // Random offset to avoid clustering

                child.fx = node.fx + Math.cos(angle) * distance;
                child.fy = node.fy + Math.sin(angle) * distance;

                repositionChildren(child); // Apply recursively to deeper levels
            });
        }
    }

    repositionChildren(d); // Start repositioning from dragged node
}*/

// Reset button functionality - clears the graph and reloads it
document.getElementById("reset").addEventListener("click", () => {
    g.selectAll("*").remove(); // Remove existing elements
    loadGraph(); // Reload the graph with new randomized parameters
});

// Load the graph on page load
loadGraph();
