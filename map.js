const width = window.innerWidth;
const height = window.innerHeight;// * 0.8;
var color = d3.scaleOrdinal(d3.schemeCategory10);
const NODE_MAX_LINE_LENGTH = 20;
const FORCE_STRENGTH = -100
const LINK_DISTANCE = 100
let nodes = [];
let links = [];

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
    .force("attract", d3.forceRadial(0, width / 2, height / 2).strength(0.02))
    .force("collision", d3.forceCollide().radius(d => d.width / 2 ).iterations(10));

// Function to load and render the graph
function loadGraph() {
    d3.json("data/cybersecurity-domains.json").then(data => {
        const root = d3.hierarchy(data);
        console.log(data);
        assignColors(root,null);
        //const nodes = root.descendants();
        //const links = root.links();
        nodes = [];
        links = [];

        // Recursively traverse the JSON to extract nodes and links
        function traverse(node, parent = null) {
            // calculating width & height based on text length and split 
            // should be moved after the actual text splitting and use the font size as input for a more stable approach
            node.height = node.name.length > NODE_MAX_LINE_LENGTH ? 50 : 30; // Store height
            if (node.name.length > NODE_MAX_LINE_LENGTH) {
                node.width = Math.max(100, node.name.length/2 * 9 + 100); // Store width
            } else {
                node.width = Math.max(100, node.name.length * 8 + 50); // Store width 
            }


            if (nodes.length === 0) {
                node.isCentralNode = true;
                node.fx = width / 2;
                node.fy = height / 2;
            }

            nodes.push(node);
            if (parent) {
                links.push({ source: parent, target: node });
            }
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
            const lineSpacing = 20; // Spacing for multi-line text
            const topMargin = 3;

            if (d.name.length > NODE_MAX_LINE_LENGTH) { // If the text is too long, split it
                const words = d.name.split(" "); // Split by spaces
                const mid = Math.ceil(words.length / 2); // Find the middle
                const firstLine = words.slice(0, mid).join(" ");
                const secondLine = words.slice(mid).join(" ");

                textGroup.append("text")
                    .attr("dy", d.height / 2 - lineSpacing + topMargin)
                    .attr("dx", d.width / 2)
                    .attr("text-anchor", "middle")
                    .text(firstLine);

                textGroup.append("text")
                    .attr("dy", d.height / 2 + topMargin)
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

/*
// Drag event functions
function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
}*/

function dragstarted(event, d) {
    if (!event.active) simulation.alphaTarget(0.3).restart();

    if (event.sourceEvent.shiftKey) {
        // Fix the node's position if Shift is held or central node
        d.fx = d.x;
        d.fy = d.y;
    } else {

        // Unfix the node itself if needed (you can remove this if it's fixed elsewhere)
        d.fx = null;
        d.fy = null;

        // Recursively unfix all children
        function unfixChildren(node) {
            if (node.children) {
                node.children.forEach(child => {
                    child.fx = null;
                    child.fy = null;
                    unfixChildren(child); // Recursively unfix children
                });
            }
        }
        unfixChildren(d); // Unfix all children starting from the current node
    } 
}


// Function to move child nodes along with parent node
// unfortunately it causes buggy behavior

function dragged(event, d) {
    if (event.sourceEvent.shiftKey) {
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
    } else {
        d.fx = event.x;
        d.fy = event.y;
    }
}

/*
function dragged(event, d) {
    d.fx = event.x;
    d.fy = event.y;
}*/

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    if (!event.sourceEvent.shiftKey) { // Only keep position fixed if CTRL is held
        if (!d.isCentralNode) {
            d.fx = null;
            d.fy = null;
        }
    }
}

document.getElementById("reset").addEventListener("click", () => {
    // Clear the current graph elements
    g.selectAll("*").remove();

    // Reload the graph with the current structure
    loadGraph();

    // Slightly adjust the node positions to "shake them up"
    adjustNodePositions();

    // Apply force simulation with a weaker force to reduce overlap
    applyWeakenedForces();

    // After a delay, tighten the forces back to their original strength
    setTimeout(() => {
        applyTightenedForces();
    }, 1000); // Delay before re-strengthening the forces
});

// Adjust node positions slightly (shake them up without randomizing entirely)
function adjustNodePositions() {
    const shakeAmount = 30; // Amount by which to "shake" nodes

    nodes.forEach(d => {
        // Apply a small random shake to each node's x and y position
        const shakeX = (Math.random() - 0.5) * shakeAmount;
        const shakeY = (Math.random() - 0.5) * shakeAmount;

        // Apply the shake while keeping within the screen boundaries
        d.x += shakeX;
        d.y += shakeY;

        // Optionally, reset the fixed positions (if any)
        d.fx = null;
        d.fy = null;
    });
}

// Weaken the forces to spread the nodes apart and reduce overlap
function applyWeakenedForces() {
    simulation.force("charge").strength(-30); // Weaken charge force
    simulation.force("link").strength(0.05);  // Weaken link force to reduce attraction between nodes
    simulation.alpha(1).restart(); // Restart the simulation with these weaker forces
}

// Tighten the forces back to normal to bring the graph back together
function applyTightenedForces() {
    simulation.force("charge").strength(-100); // Restore stronger charge force
    simulation.force("link").strength(1); // Restore normal link force to attract nodes together
    simulation.alpha(1).restart(); // Restart the simulation with normal forces
}
// Load the graph on page load
loadGraph();