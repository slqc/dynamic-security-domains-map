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
const FORCE_STRENGTH = -80;  // Reduced from -100 for tighter layout
const LINK_DISTANCE = 80;   // Reduced from 100 for closer nodes
let nodes = [];
let links = [];
let current_json = "";

// Get references to existing HTML elements
const dropdown = document.getElementById('datasetDropdown');
const fitButton = document.getElementById('fit-button');
const resetButton = document.getElementById('reset');
const zoomSlider = document.getElementById('zoomSlider');
const zoomValue = document.getElementById('zoomValue');
const layoutSelect = document.getElementById('layoutSelect');

// Select the SVG element and set its dimensions
const svg = d3.select("#graph")
    .attr("width", width)
    .attr("height", height);

// Store current transform for boundary calculations
let currentTransform = d3.zoomIdentity;

// Get initial zoom level from slider (0.8 = 80% of normal size)
let userZoomLevel = parseFloat(zoomSlider.value);
let currentLayout = 'organic'; // Track current layout
const initialZoom = d3.zoomIdentity.scale(userZoomLevel);

// Create zoom behavior with proper extent handling
const zoom = d3.zoom()
    .scaleExtent([0.1, 4])
    .on("zoom", (event) => {
        g.attr("transform", event.transform);
        // Update current transform for boundary calculations
        currentTransform = event.transform;
        
        // Update slider and display value when zoom changes from other sources (mouse wheel, etc.)
        if (Math.abs(event.transform.k - userZoomLevel) > 0.05) {
            userZoomLevel = event.transform.k;
            zoomSlider.value = userZoomLevel;
            zoomValue.textContent = userZoomLevel.toFixed(1) + 'x';
        }
    });

// Add zoom behavior to SVG
svg.call(zoom);

// Add a zoomable group to the SVG
const g = svg.append("g");

// Layout creation functions
function createOrganicLayout() {
    return d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id)
            .distance(d => {
                if (d.source.depth === 0) return 140;
                if (d.source.depth === 1) return 90;
                return 60;
            })
            .strength(0.8))
        .force("charge", d3.forceManyBody()
            .strength(d => {
                if (d.depth === 0) return -800;
                if (d.depth === 1) return -400;
                return -120;
            })
            .distanceMin(40)
            .distanceMax(400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide()
            .radius(d => Math.max(d.width, d.height) / 2 + 25)
            .iterations(3))
        .force("radial", d3.forceRadial()
            .radius(d => {
                if (d.depth === 0) return 0;
                if (d.depth === 1) return 180;
                if (d.depth === 2) return 280;
                return 380;
            })
            .x(width / 2)
            .y(height / 2)
            .strength(d => d.depth === 1 ? 0.4 : 0.2))
        .force("branchSeparation", () => {
            const mainBranches = nodes.filter(d => d.depth === 1);
            const angleStep = (2 * Math.PI) / mainBranches.length;
            
            mainBranches.forEach((branch, i) => {
                const targetAngle = i * angleStep;
                const targetRadius = 200;
                const targetX = width / 2 + Math.cos(targetAngle) * targetRadius;
                const targetY = height / 2 + Math.sin(targetAngle) * targetRadius;
                
                const dx = targetX - branch.x;
                const dy = targetY - branch.y;
                branch.vx += dx * 0.02;
                branch.vy += dy * 0.02;
                
                const children = nodes.filter(d => d.parent === branch);
                children.forEach((child, j) => {
                    const childAngle = targetAngle + (j - children.length / 2) * (angleStep * 0.3) / children.length;
                    const childRadius = 280 + child.depth * 40;
                    const childTargetX = width / 2 + Math.cos(childAngle) * childRadius;
                    const childTargetY = height / 2 + Math.sin(childAngle) * childRadius;
                    
                    const cdx = childTargetX - child.x;
                    const cdy = childTargetY - child.y;
                    child.vx += cdx * 0.015;
                    child.vy += cdy * 0.015;
                });
            });
        });
}

function createRadialLayout() {
    return d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id)
            .distance(d => {
                if (d.source.depth === 0) return 120;
                if (d.source.depth === 1) return 80;
                return 60;
            })
            .strength(0.8))
        .force("charge", d3.forceManyBody()
            .strength(d => {
                if (d.depth === 0) return -500;
                if (d.depth === 1) return -300;
                return -150;
            }))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide().radius(d => Math.max(d.width, d.height) / 2 + 10))
        .force("radial", d3.forceRadial()
            .radius(d => {
                if (d.depth === 0) return 0;
                if (d.depth === 1) return 150;
                if (d.depth === 2) return 250;
                return 350;
            })
            .x(width / 2)
            .y(height / 2)
            .strength(0.5));
}

function createHierarchicalLayout() {
    return d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id)
            .distance(d => 80 + d.target.depth * 40)
            .strength(1.0))
        .force("charge", d3.forceManyBody()
            .strength(d => {
                if (d.depth === 0) return -800;
                if (d.depth === 1) return -400;
                return -100;
            }))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide()
            .radius(d => Math.max(d.width, d.height) / 2 + 20)
            .iterations(2))
        .force("branchSeparation", () => {
            const mainBranches = nodes.filter(d => d.depth === 1);
            for (let i = 0; i < mainBranches.length; i++) {
                for (let j = i + 1; j < mainBranches.length; j++) {
                    const a = mainBranches[i];
                    const b = mainBranches[j];
                    const dx = b.x - a.x;
                    const dy = b.y - a.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = 200;
                    
                    if (distance < minDistance) {
                        const force = (minDistance - distance) / distance * 0.1;
                        const fx = dx * force;
                        const fy = dy * force;
                        
                        a.vx -= fx;
                        a.vy -= fy;
                        b.vx += fx;
                        b.vy += fy;
                    }
                }
            }
        });
}

function createClusterLayout() {
    return d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id)
            .distance(d => d.source.branchId === d.target.branchId ? 60 : 120)
            .strength(0.9))
        .force("charge", d3.forceManyBody()
            .strength(d => d.depth === 0 ? -600 : -150)
            .distanceMax(300))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide()
            .radius(d => Math.max(d.width, d.height) / 2 + 15))
        .force("cluster", () => {
            const clusters = {};
            const mainBranches = nodes.filter(d => d.depth === 1);
            
            mainBranches.forEach((branch, i) => {
                const angle = (i / mainBranches.length) * 2 * Math.PI;
                clusters[branch.id] = {
                    x: width / 2 + Math.cos(angle) * 200,
                    y: height / 2 + Math.sin(angle) * 200
                };
            });

            nodes.forEach(d => {
                if (d.depth === 0) return;
                
                let clusterId = d.branchId || (d.depth === 1 ? d.id : d.parent?.branchId);
                if (clusters[clusterId]) {
                    const cluster = clusters[clusterId];
                    const dx = cluster.x - d.x;
                    const dy = cluster.y - d.y;
                    const force = 0.03 * (d.depth === 1 ? 2 : 1);
                    d.vx += dx * force;
                    d.vy += dy * force;
                }
            });
        });
}

function createSpringLayout() {
    return d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id)
            .distance(d => {
                const baseDistance = 100;
                const depthMultiplier = 1 + d.target.depth * 0.3;
                const importanceMultiplier = d.source.children ? 1.5 : 1;
                return baseDistance * depthMultiplier * importanceMultiplier;
            })
            .strength(d => d.source.depth === 0 ? 1.2 : 0.8))
        .force("charge", d3.forceManyBody()
            .strength(d => {
                const baseStrength = -200;
                const depthFactor = Math.max(0.3, 1 - d.depth * 0.2);
                const sizeFactor = (d.children?.length || 0) * 0.1 + 1;
                return baseStrength * depthFactor * sizeFactor;
            })
            .distanceMin(50)
            .distanceMax(400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide()
            .radius(d => Math.max(d.width, d.height) / 2 + 25)
            .iterations(3));
}

// Helper function for line intersection detection
function getLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null;
    
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;
    
    return {
        x: x1 + t * (x2 - x1),
        y: y1 + t * (y2 - y1),
        onLine1: t >= 0 && t <= 1,
        onLine2: u >= 0 && u <= 1
    };
}

// Tree Layout - Guarantees no crossings
function createTreeLayout() {
    return d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id)
            .distance(100)
            .strength(1))
        .force("layered", () => {
            const layers = {};
            
            // Group nodes by depth
            nodes.forEach(d => {
                if (!layers[d.depth]) layers[d.depth] = [];
                layers[d.depth].push(d);
            });
            
            // Position each layer to prevent crossings
            Object.keys(layers).forEach(depth => {
                const layerNodes = layers[depth];
                const layerY = 80 + parseInt(depth) * 140; // Fixed Y for each layer
                
                // Sort nodes by their parent's position for consistent ordering
                if (parseInt(depth) > 0) {
                    layerNodes.sort((a, b) => {
                        if (a.parent && b.parent) {
                            return a.parent.x - b.parent.x;
                        }
                        return 0;
                    });
                }
                
                // Distribute nodes horizontally within layer
                layerNodes.forEach((node, i) => {
                    const spacing = Math.max(120, width / (layerNodes.length + 1));
                    const startX = (width - (layerNodes.length - 1) * spacing) / 2;
                    const targetX = startX + i * spacing;
                    
                    // Apply force toward layer position
                    const dx = targetX - node.x;
                    const dy = layerY - node.y;
                    
                    node.vx += dx * 0.1;
                    node.vy += dy * 0.2; // Strong Y force for layer separation
                });
            });
        });
}

// Fixed Position Layout - Fixes first-level nodes around center
function createFixedPositionLayout() {
    return d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id)
            .distance(d => {
                if (d.source.depth === 0) return 0; // No distance constraint from center
                if (d.source.depth === 1) return 80; // Normal distance for sub-nodes
                return 60;
            })
            .strength(d => {
                if (d.source.depth === 0) return 0; // No link force from center
                return 0.8;
            }))
        .force("charge", d3.forceManyBody()
            .strength(d => {
                if (d.depth === 0) return -400; // Moderate central repulsion
                if (d.depth === 1) return 0; // No repulsion for fixed nodes
                return -150; // Normal repulsion for sub-nodes
            }))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collision", d3.forceCollide()
            .radius(d => Math.max(d.width, d.height) / 2 + 20)
            .iterations(2));
}

// Enhanced Fixed Position Layout with absolute positioning
function createEnhancedFixedLayout() {
    return d3.forceSimulation()
        .force("link", d3.forceLink().id(d => d.id)
            .distance(d => {
                // Only apply link forces between non-fixed nodes
                if (d.source.depth <= 1 || d.target.depth <= 1) return 0;
                return 80;
            })
            .strength(d => {
                // No link forces involving fixed nodes
                if (d.source.depth <= 1 || d.target.depth <= 1) return 0;
                return 0.8;
            }))
        .force("charge", d3.forceManyBody()
            .strength(d => {
                // No forces on center or first-level nodes
                if (d.depth <= 1) return 0;
                if (d.depth === 2) return -180;
                return -80;
            }))
        .force("collision", d3.forceCollide()
            .radius(d => {
                // Smaller collision for fixed nodes
                if (d.depth <= 1) return 0;
                return Math.max(d.width, d.height) / 2 + 20;
            })
            .iterations(2))
        // Absolute position enforcement - overrides all other forces
        .force("absoluteFixed", () => {
            // Lock center node absolutely
            const centerNode = nodes.find(d => d.depth === 0);
            if (centerNode) {
                centerNode.x = width / 2;
                centerNode.y = height / 2;
                centerNode.vx = 0;
                centerNode.vy = 0;
            }
            
            // Lock all first-level nodes absolutely
            nodes.filter(d => d.depth === 1).forEach(d => {
                if (d.fx !== undefined && d.fy !== undefined) {
                    d.x = d.fx;
                    d.y = d.fy;
                    d.vx = 0;
                    d.vy = 0;
                }
            });
        })
        // Gentle clustering for sub-nodes only
        .force("subNodeClustering", () => {
            nodes.filter(d => d.depth >= 2).forEach(d => {
                const parent = d.parent;
                while (parent && parent.depth > 1) {
                    parent = parent.parent; // Find the first-level parent
                }
                
                if (parent && parent.depth === 1) {
                    const dx = parent.x - d.x;
                    const dy = parent.y - d.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    // Keep sub-nodes within reasonable distance of their branch
                    if (distance > 120) {
                        const force = 0.03;
                        d.vx += dx * force;
                        d.vy += dy * force;
                    }
                }
            });
        });
}

// Function to create simulation based on layout type
function createSimulation(layoutType) {
    switch(layoutType) {
        case 'radial':
            return createRadialLayout();
        case 'hierarchical':
            return createHierarchicalLayout();
        case 'cluster':
            return createClusterLayout();
        case 'spring':
            return createSpringLayout();
        case 'tree':
            return createTreeLayout();
        case 'fixed':
            return createFixedPositionLayout();
        case 'enhancedFixed':
            return createEnhancedFixedLayout();
        case 'organic':
        default:
            return createOrganicLayout();
    }
}

// Function to calculate and set fixed positions for first-level nodes
function setFixedPositions() {
    const centerX = width / 2;
    const centerY = height / 2;
    const mainBranches = nodes.filter(d => d.depth === 1);
    
    if (mainBranches.length === 0) return;
    
    // Use a fixed, generous radius for better spacing
    const baseRadius = Math.min(width, height) * 0.3; // 30% of smaller dimension
    
    // Don't make it elliptical - use perfect circle for true uniform distribution
    const radius = baseRadius;
    
    console.log(`Setting up ${mainBranches.length} branches in circle with radius ${radius}`);
    
    // Sort branches by name for consistent positioning across reloads
    mainBranches.sort((a, b) => a.name.localeCompare(b.name));
    
    mainBranches.forEach((branch, i) => {
        // Perfect uniform distribution around circle - start at top (12 o'clock)
        const angle = (i / mainBranches.length) * 2 * Math.PI - Math.PI / 2;
        
        // Calculate position on perfect circle
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        // Set fixed position
        branch.fx = x;
        branch.fy = y;
        branch.x = x;
        branch.y = y;
        branch.vx = 0;
        branch.vy = 0;
        
        console.log(`Branch "${branch.name}" positioned at angle ${(angle * 180 / Math.PI).toFixed(1)}° - (${x.toFixed(1)}, ${y.toFixed(1)})`);
    });
    
    // Absolutely fix central node position
    const centerNode = nodes.find(d => d.depth === 0);
    if (centerNode) {
        centerNode.fx = centerX;
        centerNode.fy = centerY;
        centerNode.x = centerX;
        centerNode.y = centerY;
        centerNode.vx = 0;
        centerNode.vy = 0;
        console.log(`Center node "${centerNode.name}" ABSOLUTELY fixed at (${centerX}, ${centerY})`);
    }
    
    // Give sub-nodes initial positions near their parents
    nodes.filter(d => d.depth >= 2).forEach(d => {
        let parent = d.parent;
        // Find the first-level parent
        while (parent && parent.depth > 1) {
            parent = parent.parent;
        }
        
        if (parent && parent.fx !== undefined && parent.fy !== undefined) {
            // Position sub-nodes in a small circle around their parent
            const randomAngle = Math.random() * 2 * Math.PI;
            const randomRadius = 60 + Math.random() * 40;
            d.x = parent.fx + Math.cos(randomAngle) * randomRadius;
            d.y = parent.fy + Math.sin(randomAngle) * randomRadius;
        }
    });
}

// Initialize the simulation with default layout
let simulation = createSimulation(currentLayout);

// Function to switch layouts
function switchLayout(newLayout) {
    if (newLayout === currentLayout) return;
    
    currentLayout = newLayout;
    
    // Stop current simulation
    simulation.stop();
    
    // Create new simulation with the selected layout
    simulation = createSimulation(currentLayout);
    
    // Apply the new simulation to existing nodes and links
    simulation.nodes(nodes).on("tick", function() {
        // Apply boundary constraints that respect zoom level
        nodes.forEach(d => {
            const margin = 50;
            const visibleLeft = (-currentTransform.x) / currentTransform.k + margin;
            const visibleRight = (-currentTransform.x + width) / currentTransform.k - margin;
            const visibleTop = (-currentTransform.y) / currentTransform.k + margin;
            const visibleBottom = (-currentTransform.y + height) / currentTransform.k - margin;
            
            if (d.x < visibleLeft) d.x = visibleLeft;
            if (d.x > visibleRight) d.x = visibleRight;
            if (d.y < visibleTop) d.y = visibleTop;
            if (d.y > visibleBottom) d.y = visibleBottom;
        });
        
        g.selectAll(".link")
            .attr("x1", d => d.source.x)
            .attr("y1", d => d.source.y)
            .attr("x2", d => d.target.x)
            .attr("y2", d => d.target.y);

        g.selectAll(".node")
            .attr("transform", d => `translate(${d.x - d.width / 2},${d.y - d.height / 2})`);
    });

    simulation.force("link").links(links);
    
    // Restart with high alpha for smooth transition
    simulation.alpha(0.8).restart();
}
function handleZoomSlider() {
    userZoomLevel = parseFloat(zoomSlider.value);
    zoomValue.textContent = userZoomLevel.toFixed(1) + 'x';
    
    // Apply zoom while maintaining current pan position
    const currentScale = currentTransform.k;
    const currentX = currentTransform.x;
    const currentY = currentTransform.y;
    
    // Calculate center point in graph coordinates
    const centerX = (width / 2 - currentX) / currentScale;
    const centerY = (height / 2 - currentY) / currentScale;
    
    // Create new transform that zooms around the center
    const newTransform = d3.zoomIdentity
        .translate(width / 2, height / 2)
        .scale(userZoomLevel)
        .translate(-centerX, -centerY);
    
    svg.transition().duration(200).call(zoom.transform, newTransform);
}

// Function to load and render the graph
function loadGraph(jsonPath) {
    d3.json(jsonPath).then(data => {
        const root = d3.hierarchy(data);
        console.log(data);
        assignColors(root, null);
        
        nodes = [];
        links = [];

        // Recursively traverse the JSON to extract nodes and links
        function traverse(node, parent = null, depth = 0) {
            node.depth = depth;
            node.parent = parent;
            
            // Assign branch ID for clustering
            if (depth === 1) {
                node.branchId = node.id;
            } else if (parent) {
                node.branchId = parent.branchId;
            }
            
            // Reduced sizing for better fit
            node.height = node.name.length > NODE_MAX_LINE_LENGTH ? 40 : 25;
            if (node.name.length > NODE_MAX_LINE_LENGTH) {
                node.width = Math.max(80, node.name.length/2 * 7 + 80);
            } else {
                node.width = Math.max(80, node.name.length * 6 + 40);
            }

            if (nodes.length === 0) {
                node.isCentralNode = true;
                // Position central node at center initially
                node.x = width / 2;
                node.y = height / 2;
            }

            nodes.push(node);
            if (parent) {
                links.push({ source: parent, target: node });
            }
            
            if (node.children) {
                node.children.forEach(child => traverse(child, node, depth + 1));
            }
        }
        traverse(data, null, 0);

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
        
        // Apply zoom level from slider when graph first loads
        const zoomTransform = d3.zoomIdentity.scale(userZoomLevel);
        svg.call(zoom.transform, zoomTransform);
        
        // Set fixed positions for fixed layouts
        if (currentLayout === 'fixed' || currentLayout === 'enhancedFixed') {
            setFixedPositions();
        }

        function shuffle(array) {
          const result = [...array];
          for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
          }
          return result;
        }

        function assignColors(root) {
            const shuffledColors = shuffle([...customColors]);
            let colorIndex = 0;
            
            function assignNodeColor(node, parentColor) {
                if (node.depth === 0) {
                    // Root node gets first color
                    node.data.color = shuffledColors[colorIndex++];
                    node.data.fillColor = node.data.color;
                } else if (node.depth === 1) {
                    // Each main branch gets a unique color
                    node.data.color = shuffledColors[colorIndex % shuffledColors.length];
                    node.data.fillColor = node.data.color;
                    colorIndex++;
                } else {
                    // Sub-nodes inherit parent's color
                    node.data.color = parentColor;
                    node.data.fillColor = node.data.color;
                }
                
                // Recursively assign colors to children
                node.children?.forEach(child => {
                    assignNodeColor(child, node.data.color);
                });
            }
            
            assignNodeColor(root);
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

// Enhanced reset function that preserves zoom level
function resetGraph() {
    // Reset all node positions and constraints
    nodes.forEach(d => {
        d.fx = null;
        d.fy = null;
        d.x = width / 2 + (Math.random() - 0.5) * 100;
        d.y = height / 2 + (Math.random() - 0.5) * 100;
    });

    // Reset zoom to user's current slider setting (not identity)
    const resetTransform = d3.zoomIdentity.scale(userZoomLevel);
    svg.transition().duration(750).call(
        zoom.transform,
        resetTransform
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
    
    // Update slider to reflect new zoom level
    userZoomLevel = scale;
    zoomSlider.value = userZoomLevel;
    zoomValue.textContent = userZoomLevel.toFixed(1) + 'x';
}

// Initialize event listeners
function initializeControls() {
    // Add event listeners to existing HTML elements
    resetButton.addEventListener('click', resetGraph);
    fitButton.addEventListener('click', fitGraphToViewport);
    dropdown.addEventListener('change', function () {
        current_json = 'data/' + this.value;
        loadGraph(current_json);
    });
    
    // Add layout selector event listener
    layoutSelect.addEventListener('change', function() {
        switchLayout(this.value);
    });
    // Add zoom slider event listener
    zoomSlider.addEventListener('input', handleZoomSlider);
    
    // Add layout selector event listener
    layoutSelect.addEventListener('change', function() {
        switchLayout(this.value);
    });
    
    // Initialize zoom value display
    zoomValue.textContent = userZoomLevel.toFixed(1) + 'x';
}

// Execution begins here:
fetch('data/index.json')
  .then(response => response.json())
  .then(fileList => {
    // Initialize controls first
    initializeControls();
    
    // Populate dropdown with options
    fileList.forEach(filename => {
      const option = document.createElement('option');
      option.value = filename;
      option.textContent = filename;
      dropdown.appendChild(option);
    });

    // Load first dataset
    current_json = 'data/' + fileList[0];
    loadGraph(current_json);
  });