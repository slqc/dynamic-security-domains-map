// Variables block
const width = window.innerWidth;
const height = window.innerHeight - 100; // Account for header height

const customColors = [
  "#1f77b4", "#aec7e8",
  "#ff7f0e", "#ffbb78",
  "#2ca02c", "#98df8a",
  "#d62728", "#ff9896",
  "#9467bd", "#c5b0d5",
  "#8c564b", "#c49c94",
  "#e377c2", "#f7b6d2",
  "#00FFB2", "#60CAFF",
  "#bcbd22", "#dbdb8d",
  "#17becf", "#9edae5"
]

const NODE_MAX_LINE_LENGTH = 20;
const FORCE_STRENGTH = -100;
const LINK_DISTANCE = 100;
let nodes = [];
let links = [];
let current_json = "";

// Create UI elements
const dropdown = document.createElement('select');
dropdown.id = 'datasetDropdown';

const fitButton = document.createElement('button');
fitButton.className = 'btn btn-secondary';
fitButton.innerHTML = '<i class="fas fa-expand-arrows-alt"></i> Fit Screen';
fitButton.id = 'fit-button';

// Select the SVG element and set its dimensions
const svg = d3.select("#graph")
    .attr("width", width)
    .attr("height", height);

// Store current transform for boundary calculations
let currentTransform = d3.zoomIdentity;

// Create zoom behavior with proper extent handling
const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
        g.attr("transform", event.transform);
        // Update current transform for boundary calculations
        currentTransform = event.transform;
    });

// Add zoom behavior to SVG
svg.call(zoom);

// Add a zoomable group to the SVG
const g = svg.append("g");

// Initialize the force simulation with better centering
const simulation = d3.forceSimulation()
    .force("link", d3.forceLink().id(d => d.id).distance(LINK_DISTANCE).strength(1))
    .force("charge", d3.forceManyBody().strength(FORCE_STRENGTH))
    .force("center", d3.forceCenter(width / 2, height / 2)) // Center properly
    .force("collision", d3.forceCollide().radius(d => d.width / 2).iterations(10));

// Function to load and render the graph
function loadGraph(jsonPath) {
    d3.json(jsonPath).then(data => {
        const root = d3.hierarchy(data);
        console.log(data);
        assignColors(root, null);
        
        nodes = [];
        links = [];

        // Recursively traverse the JSON to extract nodes and links
        function traverse(node, parent = null) {
            // calculating width & height based on text length and split 
            node.height = node.name.length > NODE_MAX_LINE_LENGTH ? 50 : 30;
            if (node.name.length > NODE_MAX_LINE_LENGTH) {
                node.width = Math.max(100, node.name.length/2 * 9 + 100);
            } else {
                node.width = Math.max(100, node.name.length * 8 + 50);
            }

            if (nodes.length === 0) {
                node.isCentralNode = true;
                // Don't fix the central node position initially
                // Let the force simulation handle positioning naturally
            }

            nodes.push(node);
            if (parent) {
                links.push({ source: parent, target: node });
            }
            
            if (node.children) node.children.forEach(child => traverse(child, node));
        }
        traverse(data);

        // Clear existing elements
        g.selectAll("*").remove();

        // Draw links (lines connecting nodes)
        const link = g.selectAll(".link")
            .data(links)
            .enter().append("line")
            .attr("class", "link")
            .attr("stroke", "#999");

        // Draw nodes (groups containing rectangle and text)
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
            .attr("width", d => d.width)
            .attr("height", d => d.height)
            .attr("x", 0)
            .attr("y", d => -d.height / 4)
            .attr("rx", 10)
            .attr("ry", 10)
            .attr("stroke", d => d3.color(d.fillColor).darker(1.5).formatHex())
            .attr("stroke-width", 3)
            .attr("fill", d => d3.color(d.fillColor).brighter(0).formatHex())
            .attr("opacity", 0.8);
            
        // Append text labels inside nodes
        node.each(function(d) {
            const textGroup = d3.select(this);
            const lineSpacing = 20;
            const topMargin = 3;

            if (d.name.length > NODE_MAX_LINE_LENGTH) {
                const words = d.name.split(" ");
                const mid = Math.ceil(words.length / 2);
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
            // Apply boundary constraints that respect zoom level
            nodes.forEach(d => {
                // Calculate visible boundaries considering current zoom and pan
                const margin = 50; // Margin from screen edge
                const visibleLeft = (-currentTransform.x) / currentTransform.k + margin;
                const visibleRight = (-currentTransform.x + width) / currentTransform.k - margin;
                const visibleTop = (-currentTransform.y) / currentTransform.k + margin;
                const visibleBottom = (-currentTransform.y + height) / currentTransform.k - margin;
                
                // Constrain nodes to visible area
                if (d.x < visibleLeft) d.x = visibleLeft;
                if (d.x > visibleRight) d.x = visibleRight;
                if (d.y < visibleTop) d.y = visibleTop;
                if (d.y > visibleBottom) d.y = visibleBottom;
            });
            
            link.attr("x1", d => d.source.x)
                .attr("y1", d => d.source.y)
                .attr("x2", d => d.target.x)
                .attr("y2", d => d.target.y);

            node.attr("transform", d => `translate(${d.x - d.width / 2},${d.y - d.height / 2})`);
        });

        simulation.force("link").links(links);
        
        // Restart the simulation
        simulation.alpha(1).restart();

        function shuffle(array) {
          const result = [...array];
          for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
          }
          return result;
        }

        function assignColors(node, parentColor) {
            const shuffledColors = shuffle([...customColors]);
            var i = 0;
            if (node.depth === 0) {
                node.data.color = shuffledColors[i++];
                node.data.fillColor = node.data.color;
            } else if (node.depth === 1) {
                node.data.color = shuffledColors[i++];
                node.data.fillColor = node.data.color;
            } else {
                node.data.color = parentColor;
                node.data.fillColor = node.data.color;
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

    if (event.sourceEvent.shiftKey) {
        d.fx = d.x;
        d.fy = d.y;
    } else {
        d.fx = null;
        d.fy = null;

        function unfixChildren(node) {
            if (node.children) {
                node.children.forEach(child => {
                    child.fx = null;
                    child.fy = null;
                    unfixChildren(child);
                });
            }
        }
        unfixChildren(d);
    } 
}

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
                    adjustChildren(child, dx, dy);
                });
            }
        }
        adjustChildren(d, dx, dy);
    } else {
        // Apply boundary constraints during drag
        const margin = 50;
        const visibleLeft = (-currentTransform.x) / currentTransform.k + margin;
        const visibleRight = (-currentTransform.x + width) / currentTransform.k - margin;
        const visibleTop = (-currentTransform.y) / currentTransform.k + margin;
        const visibleBottom = (-currentTransform.y + height) / currentTransform.k - margin;
        
        d.fx = Math.max(visibleLeft, Math.min(visibleRight, event.x));
        d.fy = Math.max(visibleTop, Math.min(visibleBottom, event.y));
    }
}

function dragended(event, d) {
    if (!event.active) simulation.alphaTarget(0);
    if (!event.sourceEvent.shiftKey) {
        if (!d.isCentralNode) {
            d.fx = null;
            d.fy = null;
        }
    }
}

// Enhanced reset function
function resetGraph() {
    // Reset all node positions and constraints
    nodes.forEach(d => {
        d.fx = null;
        d.fy = null;
        d.x = width / 2 + (Math.random() - 0.5) * 100;
        d.y = height / 2 + (Math.random() - 0.5) * 100;
    });

    // Reset zoom to initial state
    svg.transition().duration(750).call(
        zoom.transform,
        d3.zoomIdentity
    );

    // Restart simulation with strong alpha
    simulation.alpha(1).restart();
}

// Function to fit graph to viewport
function fitGraphToViewport() {
    if (nodes.length === 0) return;

    // Calculate bounding box of all nodes
    const xExtent = d3.extent(nodes, d => d.x);
    const yExtent = d3.extent(nodes, d => d.y);
    
    const graphWidth = xExtent[1] - xExtent[0];
    const graphHeight = yExtent[1] - yExtent[0];
    
    // Add padding
    const padding = 50;
    const scale = Math.min(
        (width - padding) / graphWidth,
        (height - padding) / graphHeight
    );
    
    const centerX = (xExtent[0] + xExtent[1]) / 2;
    const centerY = (yExtent[0] + yExtent[1]) / 2;
    
    const transform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(scale)
        .translate(-centerX, -centerY);
    
    svg.transition().duration(750).call(zoom.transform, transform);
}

// Initialize controls in header
function initializeControls() {
    const headerContainer = document.getElementById('header-container');
    const controlsLeft = document.createElement('div');
    const controlsRight = document.createElement('div');
    
    controlsLeft.className = 'controls-left';
    controlsRight.className = 'controls-right';
    
    // Move existing reset button to left controls
    const existingReset = document.getElementById('reset');
    if (existingReset) {
        controlsLeft.appendChild(existingReset);
    }
    
    // Add dropdown to left controls
    controlsLeft.appendChild(dropdown);
    
    // Add fit button to right controls
    controlsRight.appendChild(fitButton);
    
    // Insert control groups into header
    const heading = headerContainer.querySelector('h1');
    headerContainer.insertBefore(controlsLeft, heading);
    headerContainer.appendChild(controlsRight);
    
    // Add event listeners
    if (existingReset) {
        existingReset.addEventListener('click', resetGraph);
    }
    fitButton.addEventListener('click', fitGraphToViewport);
}

// Execution begins here:
fetch('data/index.json')
  .then(response => response.json())
  .then(fileList => {
    // Initialize controls first
    initializeControls();
    
    fileList.forEach(filename => {
      const option = document.createElement('option');
      option.value = filename;
      option.textContent = filename;
      dropdown.appendChild(option);
    });

    current_json = 'data/' + fileList[0];
    loadGraph(current_json);

    dropdown.addEventListener('change', function () {
      current_json = 'data/' + this.value;
      loadGraph(current_json);
    });
  });