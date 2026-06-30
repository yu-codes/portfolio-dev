/**
 * XMind-Style Roadmap Renderer
 * Features: Collapsible nodes, auto-layout, smooth animations
 */

class RoadmapRenderer {
    constructor(options = {}) {
        this.svgElement = document.getElementById('roadmap-svg') || null;
        this.data = null;
        this.nodeRadius = options.nodeRadius || 24;
        this.levelSpacing = options.levelSpacing || 220;
        // Sibling spacing to prevent button overlap with article nodes
        this.siblingSpacing = options.siblingSpacing || 18;
        this.padding = options.padding || 80;
        this.layoutMode = options.layoutMode || 'xmind';
        // Extra spacing between top-level categories (depth-0 children) to prevent overlap
        this.categorySpacing = options.categorySpacing !== undefined ? options.categorySpacing : 40;
        // Extra spacing between sibling nodes that have visible children (expanded subtrees)
        this.groupSpacing = options.groupSpacing !== undefined ? options.groupSpacing : 32;
        this.positions = new Map();
        this.expandedNodes = new Set();
        
        // Cool tech colors - muted, sophisticated cool tones
        this.levelColors = {
            0: { bg: '#1e3a5f', text: '#e2e8f0', stroke: '#0f2744' }, // Root - Deep navy
            1: { // Level 1 categories - tech-style muted cool colors
                'Backend': { bg: '#2d4a6f', text: '#e2e8f0', stroke: '#1e3a5f' }, // Slate blue
                '後端': { bg: '#2d4a6f', text: '#e2e8f0', stroke: '#1e3a5f' }, // Slate blue (zh)
                'Cloud': { bg: '#3a5a7c', text: '#e2e8f0', stroke: '#2d4a6f' }, // Steel blue
                '雲端': { bg: '#3a5a7c', text: '#e2e8f0', stroke: '#2d4a6f' }, // Steel blue (zh)
                'AI': { bg: '#4a6a8c', text: '#e2e8f0', stroke: '#3a5a7c' }, // Cool gray-blue
                'Others': { bg: '#5a7a9c', text: '#e2e8f0', stroke: '#4a6a8c' }, // Light slate
                '其他': { bg: '#5a7a9c', text: '#e2e8f0', stroke: '#4a6a8c' }, // Light slate (zh)
                'default': { bg: '#3d5a80', text: '#e2e8f0', stroke: '#2d4a6f' }
            },
            2: { bg: '#f1f5f9', text: '#1e3a5f', stroke: '#94a3b8' }, // Level 2 - Light slate
            3: { bg: '#ffffff', text: '#334155', stroke: '#cbd5e1' }  // Level 3 - Clean white
        };
        
        // Font size configuration - match article text size (14-16px)
        this.fontSizes = {
            0: 16,  // Root
            1: 15,  // Category
            2: 14,  // Domain
            3: 14   // Article
        };
    }

    getFontSize(depth) {
        return this.fontSizes[Math.min(depth, 3)];
    }

    setInitialExpansion() {
        // Expand root and first level so articles are visible, but not all levels
        if (this.data && this.data.id) {
            this.expandedNodes.add(this.data.id);
            // Expand first level (categories)
            if (this.data.children && Array.isArray(this.data.children)) {
                this.data.children.forEach(child => {
                    this.expandedNodes.add(child.id);
                });
            }
        }
    }

    expandAll(node) {
        if (!node) return;
        if (node.id) {
            this.expandedNodes.add(node.id);
        }
        if (node.children && Array.isArray(node.children)) {
            node.children.forEach(child => this.expandAll(child));
        }
    }

    collapseAllNodes() {
        // Collapse all but keep root and first level expanded
        if (this.data && this.data.id) {
            this.expandedNodes.clear();
            this.expandedNodes.add(this.data.id);
            // Keep first level expanded
            if (this.data.children && Array.isArray(this.data.children)) {
                this.data.children.forEach(child => {
                    this.expandedNodes.add(child.id);
                });
            }
        }
        this.render();
    }

    collapseAll() {
        this.expandedNodes.clear();
        this.render();
    }

    toggleNodeExpansion(nodeId, event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        if (this.expandedNodes.has(nodeId)) {
            this.collapseNodeAndDescendants(nodeId);
        } else {
            this.expandedNodes.add(nodeId);
        }
        this.render();
    }

    collapseNodeAndDescendants(nodeId) {
        this.expandedNodes.delete(nodeId);
        const node = this.findNode(this.data, nodeId);
        if (node && node.children) {
            node.children.forEach(child => {
                this.collapseNodeAndDescendants(child.id);
            });
        }
    }

    findNode(node, targetId) {
        if (!node) return null;
        if (node.id === targetId) return node;
        if (node.children) {
            for (const child of node.children) {
                const found = this.findNode(child, targetId);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Calculate text width based on font size and character type
     */
    calculateTextWidth(text, fontSize) {
        if (!text) return 0;
        // Estimate: Chinese chars are ~1.5x wider than English chars
        // Base multiplier: ~0.6 for English at this font
        let width = 0;
        for (let char of text) {
            if (/[\u4e00-\u9fff]/.test(char)) {
                width += fontSize * 1.1; // Chinese character
            } else {
                width += fontSize * 0.65; // English/number
            }
        }
        return Math.ceil(width);
    }

    render() {
        if (!this.svgElement || !this.data) {
            console.error('SVG element or data missing');
            return;
        }

        this.svgElement.innerHTML = '';
        this.positions.clear();

        // Add defs for shadows
        this.addDefs();

        // Calculate layout
        this.calculateXMindLayout();

        // Set viewBox with proper scaling
        const bounds = this.getCanvasBounds();
        const padding = 60;
        const viewBoxWidth = bounds.width + 2 * padding;
        const viewBoxHeight = bounds.height + 2 * padding;
        
        // Set viewBox to define coordinate system
        this.svgElement.setAttribute('viewBox',
            `${bounds.minX - padding} ${bounds.minY - padding} ${viewBoxWidth} ${viewBoxHeight}`);
        
        // Use 'xMinYMin meet' to maintain aspect ratio and align to top-left
        this.svgElement.setAttribute('preserveAspectRatio', 'xMinYMin meet');
        
        // Get wrapper dimensions
        const wrapper = document.getElementById('roadmap-wrapper');
        const wrapperWidth = wrapper ? wrapper.clientWidth : 800;
        const wrapperHeight = wrapper ? wrapper.clientHeight : 500;
        
        // SVG dimensions: use viewBox size (1:1 scale) to keep text readable
        // The wrapper will handle scrolling if content exceeds its bounds
        const svgWidth = viewBoxWidth;
        const svgHeight = viewBoxHeight;
        
        // Set SVG dimensions - this determines the actual pixel size
        this.svgElement.setAttribute('width', svgWidth);
        this.svgElement.setAttribute('height', svgHeight);
        
        // Set styles - NO max-width override, let container control bounds
        this.svgElement.style.cssText = `
            width: ${svgWidth}px;
            height: ${svgHeight}px;
            min-width: ${svgWidth}px;
            min-height: ${svgHeight}px;
            display: block;
            flex-shrink: 0;
        `;

        // Draw in order: connections -> nodes
        this.drawConnections();
        this.drawNodes();

        // Debug logging
        console.log('=== Roadmap Render Debug ===');
        console.log(`ViewBox: ${viewBoxWidth}x${viewBoxHeight}`);
        console.log(`SVG size: ${svgWidth}px x ${svgHeight}px`);
        if (wrapper) {
            // Force reflow to update scroll dimensions
            wrapper.offsetHeight;
            console.log(`Wrapper: clientWidth=${wrapper.clientWidth}px, scrollWidth=${wrapper.scrollWidth}px`);
            console.log(`Has horizontal scrollbar: ${wrapper.scrollWidth > wrapper.clientWidth}`);
            console.log(`Has vertical scrollbar: ${wrapper.scrollHeight > wrapper.clientHeight}`);
        }
    }

    calculateXMindLayout() {
        if (!this.data) return;

        const getVisibleChildren = (node) => {
            if (!node || !Array.isArray(node.children)) return [];
            if (!this.expandedNodes.has(node.id)) return [];
            return node.children;
        };

        // Calculate subtree height for each node
        const getSubtreeHeight = (node, depth) => {
            const children = getVisibleChildren(node);
            if (children.length === 0) {
                return this.getNodeHeight(node, depth);
            }

            let totalHeight = 0;
            children.forEach((child, idx) => {
                totalHeight += getSubtreeHeight(child, depth + 1);
                if (idx < children.length - 1) {
                    // Use categorySpacing between top-level categories (depth=0 → children are depth=1)
                    // Use groupSpacing between siblings that have expanded subtrees
                    // Use siblingSpacing for leaf siblings
                    let spacing = this.siblingSpacing;
                    if (depth === 0) {
                        spacing = this.categorySpacing;
                    } else {
                        const nextChild = children[idx + 1];
                        const currentHasChildren = getVisibleChildren(child).length > 0;
                        const nextHasChildren = getVisibleChildren(nextChild).length > 0;
                        if (currentHasChildren || nextHasChildren) {
                            spacing = this.groupSpacing;
                        }
                    }
                    totalHeight += spacing;
                }
            });

            return Math.max(this.getNodeHeight(node, depth), totalHeight);
        };

        // Position nodes recursively
        const positionNode = (node, x, yStart, yEnd, depth, parentCategory) => {
            const y = (yStart + yEnd) / 2;
            const category = depth === 1 ? node.title : parentCategory;
            
            // Calculate line and button position
            const fontSize = this.getFontSize(depth);
            const title = node.title || '';
            const textWidth = this.calculateTextWidth(title, fontSize);
            const hasChildren = node.children && node.children.length > 0;
            
            // Line extends from x to buttonX
            // Button is at the END of the line
            const buttonRadius = 8;
            const textToButtonGap = 15; // Gap between text end and button center
            const lineEndX = x + textWidth + textToButtonGap + (hasChildren ? buttonRadius : 0);
            const buttonX = lineEndX; // Button center is at line end
            
            this.positions.set(node.id, {
                x, y, node, depth, category,
                yStart, yEnd,
                textWidth,
                lineEndX,
                buttonX // Button position (center of the circle)
            });

            const children = getVisibleChildren(node);
            if (children.length === 0) return;

            // Children start AFTER the button (from button center + radius + gap)
            const childStartX = buttonX + buttonRadius + 30; // Gap after button before child line starts
            const childX = childStartX;
            
            const heights = children.map(c => getSubtreeHeight(c, depth + 1));
            
            // Calculate total height with proper spacing between siblings
            let totalSpacing = 0;
            for (let i = 0; i < children.length - 1; i++) {
                let spacing = this.siblingSpacing;
                if (depth === 0) {
                    spacing = this.categorySpacing;
                } else {
                    const currentHasChildren = getVisibleChildren(children[i]).length > 0;
                    const nextHasChildren = getVisibleChildren(children[i + 1]).length > 0;
                    if (currentHasChildren || nextHasChildren) {
                        spacing = this.groupSpacing;
                    }
                }
                totalSpacing += spacing;
            }
            const totalHeight = heights.reduce((a, b) => a + b, 0) + totalSpacing;

            let currentY = y - totalHeight / 2;

            children.forEach((child, idx) => {
                const childHeight = heights[idx];
                const childYStart = currentY;
                const childYEnd = currentY + childHeight;
                
                positionNode(child, childX, childYStart, childYEnd, depth + 1, category);
                
                // Calculate spacing to next sibling
                if (idx < children.length - 1) {
                    let spacing = this.siblingSpacing;
                    if (depth === 0) {
                        spacing = this.categorySpacing;
                    } else {
                        const currentHasChildren = getVisibleChildren(child).length > 0;
                        const nextHasChildren = getVisibleChildren(children[idx + 1]).length > 0;
                        if (currentHasChildren || nextHasChildren) {
                            spacing = this.groupSpacing;
                        }
                    }
                    currentY = childYEnd + spacing;
                }
            });
        };

        // Start layout from root
        const totalHeight = getSubtreeHeight(this.data, 0);
        positionNode(this.data, 0, -totalHeight / 2, totalHeight / 2, 0, null);
    }

    getNodeHeight(node, depth) {
        // Much smaller heights for compact display
        return depth === 0 ? 24 : (depth === 1 ? 20 : (depth === 2 ? 18 : 16));
    }

    getCanvasBounds() {
        let minX = Infinity, maxX = -Infinity;
        let minY = Infinity, maxY = -Infinity;

        this.positions.forEach(pos => {
            const height = this.getNodeHeight(pos.node, pos.depth);

            // Use actual calculated positions
            minX = Math.min(minX, pos.x);
            maxX = Math.max(maxX, pos.lineEndX || pos.buttonX || (pos.x + 100));
            minY = Math.min(minY, pos.y - height / 2);
            maxY = Math.max(maxY, pos.y + height / 2);
        });

        return {
            minX: minX === Infinity ? 0 : minX,
            minY: minY === Infinity ? 0 : minY,
            width: maxX === -Infinity ? 800 : maxX - minX,
            height: maxY === -Infinity ? 600 : maxY - minY
        };
    }

    getNodeColor(node, depth, category) {
        const isDark = document.documentElement.classList.contains('dark');

        if (depth === 0) {
            if (isDark) {
                return { bg: '#0f2744', text: '#e2e8f0', stroke: '#1e3a5f' };
            }
            return this.levelColors[0];
        }

        if (depth === 1) {
            const catColors = this.levelColors[1];
            const baseColor = catColors[node.title] || catColors['default'];
            if (isDark) {
                return {
                    bg: this.adjustColor(baseColor.bg, -30),
                    text: '#e2e8f0',
                    stroke: baseColor.stroke
                };
            }
            return baseColor;
        }

        // For deeper levels, use category-based colors with opacity
        if (depth === 2) {
            if (isDark) {
                return {
                    bg: '#1e293b',
                    text: '#e2e8f0',
                    stroke: '#475569'
                };
            }
            return {
                bg: '#e2e8f0',
                text: '#1e3a5f',
                stroke: '#94a3b8'
            };
        }

        // Level 3+
        if (isDark) {
            return { bg: '#334155', text: '#e2e8f0', stroke: '#475569' };
        }
        return this.levelColors[3];
    }

    adjustColor(hex, amount) {
        const num = parseInt(hex.replace('#', ''), 16);
        const r = Math.min(255, Math.max(0, (num >> 16) + amount));
        const g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
        const b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
        return '#' + (0x1000000 + (r << 16) + (g << 8) + b).toString(16).slice(1);
    }

    drawConnections() {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'connections');

        this.positions.forEach((pos, nodeId) => {
            const node = pos.node;
            if (!node.children || !this.expandedNodes.has(nodeId)) return;

            const visibleChildren = node.children.filter(c => this.positions.has(c.id));
            if (visibleChildren.length === 0) return;

            visibleChildren.forEach(child => {
                const childPos = this.positions.get(child.id);
                if (!childPos) return;

                // Connection starts from parent's BUTTON position (end of parent's line)
                const x1 = pos.buttonX;
                const y1 = pos.y;
                
                // Connection ends at the START of child's line (child.x)
                const x2 = childPos.x - 5;
                const y2 = childPos.y;

                // Bezier curve for smooth connection
                const midX = x1 + (x2 - x1) * 0.5;

                const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                path.setAttribute('d', `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`);
                path.setAttribute('fill', 'none');

                // Color based on category
                const colors = this.getNodeColor(child, childPos.depth, childPos.category);
                path.setAttribute('stroke', colors.stroke);
                path.setAttribute('stroke-width', pos.depth === 0 ? '2' : '1.5');
                path.setAttribute('opacity', '0.6');

                g.appendChild(path);
            });
        });

        this.svgElement.appendChild(g);
    }

    drawNodes() {
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', 'nodes');

        // Sort positions by depth to draw deeper nodes first
        const sortedPositions = Array.from(this.positions.entries())
            .sort((a, b) => b[1].depth - a[1].depth);

        sortedPositions.forEach(([nodeId, pos]) => {
            const nodeEl = this.createNode(pos);
            g.appendChild(nodeEl);
        });

        this.svgElement.appendChild(g);
    }

    createNode(pos) {
        const { x, y, node, depth, category, textWidth, lineEndX, buttonX } = pos;
        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        g.setAttribute('class', `node depth-${depth}`);
        g.setAttribute('data-node-id', node.id);

        const colors = this.getNodeColor(node, depth, category);
        const hasChildren = node.children && node.children.length > 0;
        const isExpanded = this.expandedNodes.has(node.id);
        const hasUrl = node.url && node.url.length > 0;
        const title = node.title || '';
        const fontSize = this.getFontSize(depth);

        // Draw horizontal line under node FIRST (from x to lineEndX)
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', String(x));
        line.setAttribute('y1', String(y));
        line.setAttribute('x2', String(lineEndX));
        line.setAttribute('y2', String(y));
        line.setAttribute('stroke', colors.stroke);
        line.setAttribute('stroke-width', '1.5');
        line.setAttribute('opacity', '0.7');
        line.setAttribute('pointer-events', 'none');
        g.appendChild(line);

        // Create text element - positioned above the line
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', String(x));
        text.setAttribute('y', String(y - 6)); // Move up above line
        text.setAttribute('text-anchor', 'start');
        text.setAttribute('dy', '0.35em');
        text.setAttribute('fill', colors.text);
        text.setAttribute('font-size', `${fontSize}px`);
        text.setAttribute('font-weight', depth <= 1 ? '600' : '500');
        text.setAttribute('pointer-events', 'auto');
        
        // Show full text - no truncation
        text.textContent = title;
        
        // Add tooltip for accessibility
        if (title.length > 30) {
            const titleEl = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            titleEl.textContent = title;
            text.appendChild(titleEl);
        }
        
        g.appendChild(text);

        // Click handler for nodes with URL (both leaf and directory nodes)
        if (hasUrl) {
            text.setAttribute('cursor', 'pointer');
            text.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                window.location.href = node.url;
            });
            text.addEventListener('mouseenter', () => {
                text.setAttribute('fill', '#3b82f6');
                text.setAttribute('text-decoration', 'underline');
            });
            text.addEventListener('mouseleave', () => {
                text.setAttribute('fill', colors.text);
                text.setAttribute('text-decoration', 'none');
            });
        }

        // Small circle button with child count - positioned at buttonX (end of line)
        if (hasChildren) {
            const count = this.countDescendants(node);
            const buttonRadius = 8;

            const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            circle.setAttribute('cx', String(buttonX));
            circle.setAttribute('cy', String(y));
            circle.setAttribute('r', String(buttonRadius));
            circle.setAttribute('fill', isExpanded ? colors.stroke : '#94a3b8');
            circle.setAttribute('stroke', colors.stroke);
            circle.setAttribute('stroke-width', '1');
            circle.setAttribute('cursor', 'pointer');
            g.appendChild(circle);

            // Count text in circle
            const countText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            countText.setAttribute('x', String(buttonX));
            countText.setAttribute('y', String(y));
            countText.setAttribute('text-anchor', 'middle');
            countText.setAttribute('dy', '0.35em');
            countText.setAttribute('fill', '#ffffff');
            countText.setAttribute('font-size', '8px');
            countText.setAttribute('font-weight', 'bold');
            countText.setAttribute('pointer-events', 'none');
            countText.textContent = String(count);
            g.appendChild(countText);

            // Click handler for expand/collapse - ONLY on the button
            circle.addEventListener('click', (e) => {
                e.stopPropagation();
                e.preventDefault();
                this.toggleNodeExpansion(node.id, e);
            });
        }

        return g;
    }

    countDescendants(node) {
        // Only count direct children (next level), not all descendants
        if (!node.children || node.children.length === 0) return 0;
        return node.children.length;
    }

    addDefs() {
        const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
        
        const filter = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
        filter.setAttribute('id', 'shadow');
        filter.setAttribute('x', '-20%');
        filter.setAttribute('y', '-20%');
        filter.setAttribute('width', '140%');
        filter.setAttribute('height', '140%');

        const feDropShadow = document.createElementNS('http://www.w3.org/2000/svg', 'feDropShadow');
        feDropShadow.setAttribute('dx', '0');
        feDropShadow.setAttribute('dy', '2');
        feDropShadow.setAttribute('stdDeviation', '3');
        feDropShadow.setAttribute('flood-opacity', '0.15');
        filter.appendChild(feDropShadow);

        defs.appendChild(filter);
        this.svgElement.appendChild(defs);
    }
}

// Roadmap data structure - fallback only (prefer dynamic data from Hugo)
const roadmapStructure = {
    id: 'root',
    title: 'Roadmap',
    children: []
};

document.addEventListener('DOMContentLoaded', () => {
    // Use custom data if provided, otherwise use default structure
    const data = window.roadmapData || roadmapStructure;
    
    if (!document.getElementById('roadmap-svg')) {
        console.log('No roadmap SVG element found');
        return;
    }

    if (window.__roadmapRendererInitialized) return;
    window.__roadmapRendererInitialized = true;

    // Merge options properly: user options override defaults
    const userOptions = window.roadmapOptions || {};
    const options = {
        layoutMode: userOptions.layoutMode || 'xmind',
        nodeRadius: userOptions.nodeRadius || 24,
        levelSpacing: userOptions.levelSpacing !== undefined ? userOptions.levelSpacing : 180,
        siblingSpacing: userOptions.siblingSpacing !== undefined ? userOptions.siblingSpacing : 16,
        categorySpacing: userOptions.categorySpacing !== undefined ? userOptions.categorySpacing : 40,
        padding: userOptions.padding !== undefined ? userOptions.padding : 80
    };

    const renderer = new RoadmapRenderer(options);
    renderer.data = data;
    renderer.setInitialExpansion();
    renderer.render();

    // Expose controls
    window.roadmapRenderer = renderer;
    window.expandAllRoadmap = () => {
        renderer.expandAll(renderer.data);
        renderer.render();
    };
    window.collapseAllRoadmap = () => {
        renderer.collapseAll();
    };

    // Add bidirectional drag support for roadmap (horizontal and vertical)
    const wrapper = document.getElementById('roadmap-wrapper');
    if (wrapper) {
        const svg = document.getElementById('roadmap-svg');
        let isDown = false;
        let startX = 0;
        let startY = 0;
        let scrollLeft = 0;
        let scrollTop = 0;

        // --- Zoom state ---
        let zoomLevel = 1;
        const zoomMin = 0.3;
        const zoomMax = 2.5;
        const zoomStep = 0.08;

        function applyZoom() {
            if (!svg) return;
            svg.style.transformOrigin = '0 0';
            svg.style.transform = `scale(${zoomLevel})`;
            // Update the effective size so the wrapper scrollbars adjust
            const origWidth = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width;
            const origHeight = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height;
            svg.style.width = `${origWidth}px`;
            svg.style.height = `${origHeight}px`;
            svg.style.minWidth = `${origWidth}px`;
            svg.style.minHeight = `${origHeight}px`;
        }

        // Mouse wheel zoom
        wrapper.addEventListener('wheel', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const oldZoom = zoomLevel;
            const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
            zoomLevel = Math.min(zoomMax, Math.max(zoomMin, zoomLevel + delta));

            if (oldZoom === zoomLevel) return;

            // Zoom toward cursor position
            const rect = wrapper.getBoundingClientRect();
            const cursorX = e.clientX - rect.left + wrapper.scrollLeft;
            const cursorY = e.clientY - rect.top + wrapper.scrollTop;

            applyZoom();

            // Adjust scroll so the point under cursor stays fixed
            const scale = zoomLevel / oldZoom;
            wrapper.scrollLeft = cursorX * scale - (e.clientX - rect.left);
            wrapper.scrollTop = cursorY * scale - (e.clientY - rect.top);
        }, { passive: false });

        // Touch pinch-to-zoom
        let lastTouchDist = 0;
        let touchZoomActive = false;

        function getTouchDist(touches) {
            const dx = touches[0].clientX - touches[1].clientX;
            const dy = touches[0].clientY - touches[1].clientY;
            return Math.sqrt(dx * dx + dy * dy);
        }

        function getTouchCenter(touches, rect) {
            return {
                x: ((touches[0].clientX + touches[1].clientX) / 2) - rect.left + wrapper.scrollLeft,
                y: ((touches[0].clientY + touches[1].clientY) / 2) - rect.top + wrapper.scrollTop
            };
        }

        wrapper.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                touchZoomActive = true;
                lastTouchDist = getTouchDist(e.touches);
            }
        }, { passive: false });

        wrapper.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2 && touchZoomActive) {
                e.preventDefault();
                const dist = getTouchDist(e.touches);
                const oldZoom = zoomLevel;
                const scale = dist / lastTouchDist;
                zoomLevel = Math.min(zoomMax, Math.max(zoomMin, zoomLevel * scale));
                lastTouchDist = dist;

                if (oldZoom === zoomLevel) return;

                const rect = wrapper.getBoundingClientRect();
                const center = getTouchCenter(e.touches, rect);

                applyZoom();

                const zoomRatio = zoomLevel / oldZoom;
                wrapper.scrollLeft = center.x * zoomRatio - (((e.touches[0].clientX + e.touches[1].clientX) / 2) - rect.left);
                wrapper.scrollTop = center.y * zoomRatio - (((e.touches[0].clientY + e.touches[1].clientY) / 2) - rect.top);
            }
        }, { passive: false });

        wrapper.addEventListener('touchend', (e) => {
            if (e.touches.length < 2) {
                touchZoomActive = false;
            }
        });

        // Drag to pan

        wrapper.addEventListener('mousedown', (e) => {
            // Don't start drag if clicking on a button or text
            if (e.target.tagName === 'circle' || e.target.tagName === 'text') return;
            
            isDown = true;
            startX = e.pageX - wrapper.offsetLeft;
            startY = e.pageY - wrapper.offsetTop;
            scrollLeft = wrapper.scrollLeft;
            scrollTop = wrapper.scrollTop;
            wrapper.classList.add('grabbing');
        });

        wrapper.addEventListener('mouseleave', () => {
            isDown = false;
            wrapper.classList.remove('grabbing');
        });

        wrapper.addEventListener('mouseup', () => {
            isDown = false;
            wrapper.classList.remove('grabbing');
        });

        wrapper.addEventListener('mousemove', (e) => {
            if (!isDown) return;
            e.preventDefault();
            const x = e.pageX - wrapper.offsetLeft;
            const y = e.pageY - wrapper.offsetTop;
            const walkX = (x - startX) * 1;
            const walkY = (y - startY) * 1;
            wrapper.scrollLeft = scrollLeft - walkX;
            wrapper.scrollTop = scrollTop - walkY;
        });
    }
});

// Globals
window.RoadmapRenderer = RoadmapRenderer;
window.MindmapRenderer = RoadmapRenderer;
