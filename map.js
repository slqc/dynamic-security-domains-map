var globData;

document.addEventListener("DOMContentLoaded", function() {
    // Select the SVG element and get its dimensions
    const svg = d3.select("svg"),
          width = document.documentElement.clientWidth, // Maximum width of the website
          height = (width * 3) / 4; // Height with 4:3 aspect ratio
    svg.attr("width", width).attr("height", height); // Set SVG width and height
    const color = d3.scaleOrdinal(d3.schemeCategory10); // Color scale for nodes

    // Constants for node dimensions and link distance
    const MIN_NODE_WIDTH = 120; // Minimum width for nodes
    const DEFAULT_LINK_DISTANCE = 150; // Default link distance for all links

    // Initialize zoom behavior
    const zoom = d3.zoom()
        .scaleExtent([0.1, 10]) // Set zoom scale range
        .on("zoom", event => g.attr("transform", event.transform)); // Apply zoom transform to the group element

    const g = svg.append("g"); // Append group element to the SVG
    svg.call(zoom); // Apply zoom behavior to the SVG

    const tooltip = d3.select("#tooltip"); // Select the tooltip element

    let root; // Variable to store the hierarchical data

    // Initialize the force simulation
    const simulation = d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id).distance(d => d.distance).strength(1)) // Link force with dynamic distance
        .force("charge", d3.forceManyBody().strength(-500)) // Repulsive charge force
        .force("center", d3.forceCenter(width / 2, height / 2)) // Centering force
        .force("collision", d3.forceCollide().radius(d => d.radius)); // Collision force to prevent overlap

    // Load data and initialize the graph
    d3.json("data.json").then(data => {
        globData=Object.assign({},data);
        root = d3.hierarchy(data); // Create a hierarchy from the data
        assignColorsAndSizes(root); // Assign colors and sizes to the nodes
        assignNodeColors(root); // Assign colors to the nodes
        // Ensure all nodes are expanded initially
        root.descendants().forEach(d => { d.expanded = true; });

        update(); // Update the graph

        // Set up the simulation with the nodes and links
        simulation
            .nodes(root.descendants()) // Set nodes for the simulation
            .on("tick", ticked); // Update positions on each tick of the simulation

        simulation.force("link")
            .links(root.links().map(link => ({
                source: link.source,
                target: link.target,
                distance: link.target.data.distance || DEFAULT_LINK_DISTANCE // Set default distance if not defined
            })));
    });

    function update() {
        const nodes = root.descendants(); // Get all nodes
        const links = root.links().map(link => ({
            source: link.source,
            target: link.target,
            distance: link.target.data.distance || DEFAULT_LINK_DISTANCE // Set default distance if not defined
        }));

        // Update links
        const link = g.selectAll(".link")
            .data(links, d => `${d.source.id}-${d.target.id}`); // Bind link data

        link.enter().append("line") // Enter selection for links
            .attr("class", "link") // Set class for styling
            .attr("stroke-width", 2) // Set stroke width
            .style("stroke", "#aaa"); // Set stroke color

        link.exit().remove(); // Remove old links

        // Update nodes
        const node = g.selectAll(".node")
            .data(nodes, d => d.id); // Bind node data

        const nodeEnter = node.enter().append("g") // Enter selection for nodes
            .attr("class", "node") // Set class for styling
            .call(d3.drag() // Add drag behavior to nodes
                .on("start", dragstarted)
                .on("drag", dragged)
                .on("end", dragended))
            .on("mouseover", mouseovered) // Add mouseover event
            .on("mouseout", mouseouted) // Add mouseout event
            .on("click", clicked); // Add click event

        nodeEnter.append("rect") // Append rectangle for each node
            .attr("width", d => d.width) // Set width of rectangle
            .attr("height", d => d.height) // Set height of rectangle
            .attr("x", d => -d.width / 2) // Set x position
            .attr("y", d => -d.height / 2) // Set y position
            .attr("rx", 10) // Set x radius for rounded corners
            .attr("ry", 10) // Set y radius for rounded corners
            .attr("fill", d => d.data.fillColor) // Set fill color
            .attr("stroke", d => d.data.strokeColor) // Set stroke color
            .attr("stroke-width", d => d.children ? 4 : 2); // Thicker stroke for branch roots

        const text = nodeEnter.append("text") // Append text element to nodes
            .attr("dy", "0.35em") // Set vertical alignment
            .attr("x", 0) // Center text horizontally
            .style("text-anchor", "middle"); // Center text

        text.selectAll("tspan") // Split text into multiple lines
            .data(d => d.data.name.split("\n")) // Split name by new line
            .enter().append("tspan") // Enter selection for tspan elements
            .attr("x", 0) // Center tspan horizontally
            .attr("dy", (d, i) => i ? "1.2em" : 0) // Offset for second line
            .text(d => d); // Set text content

        // Append a group for the toggle icon only if the node has children
        const toggleGroup = nodeEnter.filter(d => d.children || d._children).append("g")
            .attr("class", "toggle") // Set class for styling
            .attr("transform", d => `translate(${d.width / 2 + 10}, ${-d.height / 2 + 10})`) // Position toggle icon
            .style("cursor", "pointer") // Cursor pointer for interactivity
            .on("click", toggleChildren); // Add click event to toggle children

        // Circle background for toggle icon
        toggleGroup.append("circle")
            .attr("r", 6) // Radius of circle
            .attr("cx", 0) // Center x
            .attr("cy", 0) // Center y
            .attr("fill", "white") // Fill color
            .attr("stroke", "black"); // Stroke color

        // Icon paths for toggle icon
        toggleGroup.append("path")
            .attr("d", d => d._children ? "M-3,0 L3,0 M0,-3 L0,3" : d.children ? "M-3,0 L3,0" : "") // Plus or minus icon
            .attr("stroke", "black") // Stroke color
            .attr("stroke-width", 2) // Stroke width
            .attr("fill", "none"); // No fill

        nodeEnter.merge(node).select(".toggle path")
            .attr("d", d => d._children ? "M-3,0 L3,0 M0,-3 L0,3" : d.children ? "M-3,0 L3,0" : ""); // Update icon on merge

        node.exit().remove(); // Remove old nodes

        // Restart the simulation
        simulation.nodes(nodes); // Update nodes in simulation
        simulation.force("link").links(links); // Update links in simulation
        simulation.alpha(1).restart(); // Restart simulation
    }

    // Toggle children on click
    function toggleChildren(event, d) {
        console.log("Toggling children for node: ", d.data.name);
        if (d.children) {
            console.log("Collapsing node");
            d._children = d.children; // Store children
            d.children = null; // Hide children
            d.expanded = false; // Mark as collapsed
        } else {
            console.log("Expanding node");
            d.children = d._children; // Restore children
            d._children = null; // Remove stored children
            d.expanded = true; // Mark as expanded
        }
        update(); // Update graph
    }

    // Update positions of nodes and links on each tick of the simulation
    function ticked() {
        g.selectAll(".link")
            .attr("x1", d => d.source.x) // Update x1 position of links
            .attr("y1", d => d.source.y) // Update y1 position of links
            .attr("x2", d => d.target.x) // Update x2 position of links
            .attr("y2", d => d.target.y); // Update y2 position of links

        g.selectAll(".node")
            .attr("transform", d => `translate(${d.x},${d.y})`); // Update position of nodes
    }

    // Assign colors and sizes to nodes based on their depth and name
    function assignColorsAndSizes(node) {
        const lines = node.data.name.split("\n"); // Split name into lines
        const lineCount = lines.length; // Count lines
        node.height = 20 + 20 * lineCount; // Adjust height based on number of lines
        node.width = Math.max(MIN_NODE_WIDTH, lines.reduce((max, line) => Math.max(max, line.length * 8), 0) + 20); // Ensure width fits longest line or minimum width
        node.radius = node.height / 2; // Radius for collision detection
        node.children?.forEach(assignColorsAndSizes); // Recursively assign colors and sizes to child nodes
    }

    // Assign colors to nodes based on their depth
    function assignNodeColors(node) {
        if (node.depth === 0) {
            node.data.fillColor = "#fff"; // Root node fill color
            node.data.strokeColor = "#000"; // Root node stroke color
        } else if (node.depth === 1) {
            const baseColor = color(node.data.name); // Generate base color
            node.data.strokeColor = baseColor; // Assign base color as stroke color
            node.data.fillColor = d3.color(baseColor).brighter(1).toString(); // Brighter fill color based on base color
        } else {
            node.data.strokeColor = node.parent.data.strokeColor; // Inherit stroke color from parent
            node.data.fillColor = d3.color(node.parent.data.strokeColor).brighter(1).toString(); // Brighter fill color based on parent's stroke color
        }
        node.children?.forEach(assignNodeColors); // Recursively assign colors to child nodes
    }

    // Drag event handlers
    function dragstarted(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart(); // Increase simulation intensity
        fixParents(d); // Fix positions of parent nodes
        d.fx = d.x; // Fix x position of dragged node
        d.fy = d.y; // Fix y position of dragged node
    }

    function dragged(event, d) {
        d.fx = event.x; // Update x position of dragged node
        d.fy = event.y; // Update y position of dragged node
        
        updateLinkDistance(d); // Update link distance dynamically
    }

    function dragended(event, d) {
        if (!event.active) simulation.alphaTarget(0); // Reduce simulation intensity
        d.fx = null; // Unfix x position of dragged node
        d.fy = null; // Unfix y position of dragged node
        unfixParents(d); // Unfix positions of parent nodes

        updateLinkDistance(d); // Finalize link distance after dragging
    }

    // Fix the positions of all parent nodes of the dragged node
    function fixParents(node) {
        if (node.parent) {
            node.parent.fx = node.parent.x; // Fix x position
            node.parent.fy = node.parent.y; // Fix y position
            fixParents(node.parent); // Recursively fix positions of parent nodes
        }
    }

    // Unfix the positions of all parent nodes of the dragged node
    function unfixParents(node) {
        if (node.parent) {
            node.parent.fx = null; // Unfix x position
            node.parent.fy = null; // Unfix y position
            unfixParents(node.parent); // Recursively unfix positions of parent nodes
        }
    }

    // Update the link distance between a node and its immediate parent
    function updateLinkDistance(node) {
        if (node.parent) {
            // Calculate the new distance based on the current positions of the node and its parent
            const dx = node.x - node.parent.x;
            const dy = node.y - node.parent.y;
            const distance = Math.sqrt(dx * dx + dy * dy); // Euclidean distance
            
            // Find the link connecting the node and its parent and update its distance
            const link = simulation.force("link").links().find(l => l.source.id === node.parent.id && l.target.id === node.id);
            if (link) {
                link.distance = distance; // Update link distance
                node.data.distance = distance; // Store the distance in the node data

                // Restart the simulation with the updated link distance
                simulation.force("link").distance(d => d.distance); // Update distance function
                simulation.alpha(1).restart(); // Restart simulation
            }
        }
    }

    // Reset the view to show the entire graph within the SVG container with slight random variations
    d3.select("#reset_view").on("click", function() {
        // Apply slight random variations to node positions
        root.descendants().forEach(d => {
            d.x += (Math.random() - 0.5) * 20; // Random x variation
            d.y += (Math.random() - 0.5) * 20; // Random y variation
        });

        // Redraw the graph with new positions
        update();

        // Run the simulation again with slight random forces to redistribute the nodes
        simulation.alpha(1).restart();

        // Delay to ensure simulation has time to reposition nodes
        setTimeout(() => {
            // Get the bounding box of the graph
            const bounds = getNodeExtents();
            if (bounds.maxX === -Infinity) return; // Guard against uninitialized bounds

            // Calculate center and scale to fit the graph in the view
            const centerX = (bounds.maxX + bounds.minX) / 2;
            const centerY = (bounds.maxY + bounds.minY) / 2;
            const scale = Math.max(0.1, Math.min(8, 0.9 / Math.max((bounds.maxX - bounds.minX) / width, (bounds.maxY - bounds.minY) / height)));
            const translate = [width / 2 - scale * centerX, height / 2 - scale * centerY];

            // Apply transition to the SVG for smooth zooming
            svg.transition()
                .duration(750)
                .call(zoom.transform, d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale));
        }, 500); // Adjust the delay as needed
    });

    // Get the bounding box of the graph to help with resetting the view
    function getNodeExtents() {
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity; // Initialize bounding box
        simulation.nodes().forEach(d => {
            minX = Math.min(minX, d.x - d.radius); // Update minX
            minY = Math.min(minY, d.y - d.radius); // Update minY
            maxX = Math.max(maxX, d.x + d.radius); // Update maxX
            maxY = Math.max(maxY, d.y + d.radius); // Update maxY
        });
        return { minX, minY, maxX, maxY }; // Return bounding box
    }

    // Show tooltip with node description on mouseover
    function mouseovered(event, d) {
        tooltip.style("visibility", "visible")
            .text(d.data.description);
    }

    // Hide tooltip on mouseout
    function mouseouted() {
        tooltip.style("visibility", "hidden");
    }

    // Show tooltip with node description on click
    function clicked(event, d) {
        console.log(d.data.description)
        tooltip.style("visibility", "visible")
            .text(d.data.description)
            .style("left", (event.pageX + 10) + "px")
            .style("top", (event.pageY + 10) + "px");
    }
});
