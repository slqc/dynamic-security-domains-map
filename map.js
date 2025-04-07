const width = window.innerWidth;
const height = window.innerHeight;// * 0.8;
var color = d3.scaleOrdinal(d3.schemeCategory10);
const NODE_MAX_LINE_LENGTH = 20;
const FORCE_STRENGTH = -100
const LINK_DISTANCE = 100

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
    .force("link", d3.forceLink().id(d => d.id).distance(LINK_DISTANCE).strength(1)) // Define link distance
    .force("charge", d3.forceManyBody().strength(FORCE_STRENGTH)) // Repel nodes from each other
    .force("center", d3.forceCenter(width / 1.8, height / 1.8)) // Center the graph
    //.force("gravity", d3.forceManyBody().strength(-30)) // tweak strength
    .force("attract", d3.forceRadial(0, width / 2, height / 2).strength(0.02))
    //.force("collision", d3.forceCollide().radius(d => d.width / 2 ).iterations(1))
    .force("collision", d3.forceCollide().radius(d => d.width / 2 ).iterations(10));

// Function to load and render the graph
function loadGraph() {
    d3.json("cybersecurity-domains.json").then(data => {
        const root = d3.hierarchy(data);
        //root.data.isCentralNode = true;
        console.log(data);
        assignColors(root,null);
        //const nodes = root.descendants();
        //const links = root.links();
        const nodes = [];
        const links = [];

        // Recursively traverse the JSON to extract nodes and links
        function traverse(node, parent = null) {
            node.width = Math.max(100, node.name.length * 5 + 52); // Store width
            node.height = node.name.length > NODE_MAX_LINE_LENGTH ? 50 : 30; // Store height

            if (nodes.length === 0) {
                node.isCentralNode = true;
                node.fx = width / 2;
                node.fy = height / 2;
            }

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
            .attr("x", 0)//d => -d.width / 2)
            .attr("y", d => -d.height / 4)
            .attr("rx", 10)  // Rounded corners
            .attr("ry", 10)  // Rounded corners
            .attr("stroke", d => d.color)
            .attr("stroke-width", 4)
            .attr("fill", d => d3.color(d.fillColor).brighter(1.5).formatHex())
            .attr("opacity", 0.8);
            
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

        // Apply force simulation to nodes and links
        simulation.nodes(nodes).on("tick", function() {
             //node.attr("cx", d => d.x = Math.max(10, Math.min(width - 10, d.x)))
             //    .attr("cy", d => d.y = Math.max(10, Math.min(height - 10, d.y)));
             nodes.forEach(d => {
                d.x = Math.max(10, Math.min(width - 10, d.x));
                d.y = Math.max(10, Math.min(height - 10, d.y));
            });
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x - d.width / 2},${d.y - d.height / 2})`);
        });

        simulation.force("link").links(links);      

        function assignColors(node, parentColor) {
            if (node.depth === 0) {
                node.data.color = color(node.data.name); // Unique color for root
                node.data.fillColor = node.data.color;
                node.data.fillColor.opacity = 0.2;
            } else if (node.depth === 1) {
                node.data.color = color(node.data.name); // Unique color for each branch root
                node.data.fillColor = node.data.color;
                node.data.fillColor.opacity = 0.2;
            } else {
                node.data.color = parentColor; // Subnodes get the parent color
                node.data.fillColor = node.data.color;
                node.data.fillColor.opacity = 0.2;
            }
            node.children?.forEach(child => {
                assignColors(child, node.data.color);

            });
        }
    });
}

// Drag event functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}


// Function to move child nodes along with parent node
// unfortunately it causes buggy behavior
/*
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
                //child.fx = Math.max(10, Math.min(width - 10, (child.fx ?? child.x) + dx));
                //child.fy = Math.max(10, Math.min(height - 10, (child.fy ?? child.y) + dy));
                adjustChildren(child, dx, dy);
            });
        }
    }
    adjustChildren(d, dx, dy);
    console.log(`dx: ${dx}, dy: ${dy}`); // Debugging output
}*/


function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    if (!event.sourceEvent.shiftKey) { // Only keep position fixed if CTRL is held
        if (!d.isCentralNode) {
            d.fx = null;
            d.fy = null;
        }
    }
}

// Reset button functionality - clears the graph and reloads it
document.getElementById("reset").addEventListener("click", () => {
    g.selectAll("*").remove(); // Remove existing elements
    loadGraph(); // Reload the graph with new randomized parameters
});

// Load the graph on page load
loadGraph();