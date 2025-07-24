import { LAYOUT_CONFIG, COLORS, TEXT_CONFIG } from './constants.js';
import { getClassColor } from './utils.js';
import { getConnectionPoint } from './positioning.js';

export function drawTree(g, root, instancePath, instanceData) {
    // Draw links with custom path for 45-degree branches
    const links = g.selectAll('.link')
        .data(root.links())
        .enter().append('path')
        .attr('class', d => `link ${(d.source.data.isMainPath && d.target.data.isMainPath) ? 'main-path' : ''}`)
        .attr('d', d => {
            // For main path connections, use horizontal lines
            if (d.source.data.isMainPath && d.target.data.isMainPath) {
                return `M${d.source.y},${d.source.x}L${d.target.y},${d.target.x}`;
            }
            
            // For branch connections from main path rectangles, start from border
            const sourcePoint = getConnectionPoint(d.source, d.target);
            return `M${sourcePoint.y},${sourcePoint.x}L${d.target.y},${d.target.x}`;
        });
    
    // Draw nodes
    const nodes = g.selectAll('.node')
        .data(root.descendants())
        .enter().append('g')
        .attr('class', d => {
            let classes = 'node';
            if (d.data.isMainPath) classes += ' main-path';
            if (!d.data.is_leaf) classes += ' split';
            return classes;
        })
        .attr('transform', d => `translate(${d.y},${d.x})`)
        .on('mouseover', function(event, d) {
            if (!d.data.isMainPath) {
                showTooltip(event, d, instanceData);
            }
        })
        .on('mouseout', function(event, d) {
            if (!d.data.isMainPath) {
                hideTooltip();
            }
        });
    
    // Add shapes based on main path or not
    nodes.each(function(d) {
        const node = d3.select(this);
        
        if (d.data.isMainPath) {
            drawMainPathNode(node, d, instanceData);
        } else {
            drawBranchNode(node, d);
        }
    });
}

function drawMainPathNode(node, d, instanceData) {
    const rectHeight = d.data.is_leaf ? LAYOUT_CONFIG.rectHeight.leaf : LAYOUT_CONFIG.rectHeight.decision;
    
    node.append('rect')
        .attr('x', -LAYOUT_CONFIG.rectWidth/2)
        .attr('y', -rectHeight/2)
        .attr('width', LAYOUT_CONFIG.rectWidth)
        .attr('height', rectHeight)
        .style('fill', d => {
            if (d.data.is_leaf) {
                return getClassColor(d.data.class_label);
            } else {
                return COLORS.mainPathRect;
            }
        });
    
    if (d.data.is_leaf) {
        drawLeafNodeText(node, d);
    } else {
        drawDecisionNodeText(node, d, instanceData);
    }
}

function drawBranchNode(node, d) {
    node.append('circle')
        .attr('r', LAYOUT_CONFIG.circleRadius)
        .style('fill', d => {
            if (d.data.is_leaf) {
                return getClassColor(d.data.class_label);
            } else {
                return COLORS.branchCircle;
            }
        });
}

function drawLeafNodeText(node, d) {
    node.append('text')
        .attr('y', TEXT_CONFIG.leaf.titleOffset)
        .text('Leaf Node')
        .style('font-weight', 'bold')
        .style('font-size', TEXT_CONFIG.leaf.titleFontSize);
    
    node.append('text')
        .attr('y', TEXT_CONFIG.leaf.classOffset)
        .text(d.data.class_label.replace('class_', 'Class '))
        .style('font-weight', 'bold')
        .style('font-size', TEXT_CONFIG.leaf.classFontSize);
    
    node.append('text')
        .attr('y', TEXT_CONFIG.leaf.samplesOffset)
        .text(`Samples: ${d.data.n_samples}`)
        .style('font-size', TEXT_CONFIG.leaf.samplesFontSize);
    
    node.append('text')
        .attr('y', TEXT_CONFIG.leaf.distLabelOffset)
        .text(`Distribution:`)
        .style('font-size', TEXT_CONFIG.leaf.distFontSize);
    
    node.append('text')
        .attr('y', TEXT_CONFIG.leaf.distValueOffset)
        .text(`[${d.data.value.join(', ')}]`)
        .style('font-size', TEXT_CONFIG.leaf.distFontSize);
}

function drawDecisionNodeText(node, d, instanceData) {
    const featureName = d.data.feature_name.replace(/_/g, ' ');
    const instanceValue = instanceData[d.data.feature_name];
    const decision = instanceValue <= d.data.threshold ? 'LEFT' : 'RIGHT';
    
    node.append('text')
        .attr('y', TEXT_CONFIG.decision.titleOffset)
        .text('Decision Node')
        .style('font-weight', 'bold')
        .style('font-size', TEXT_CONFIG.decision.titleFontSize);
    
    node.append('text')
        .attr('y', TEXT_CONFIG.decision.featureOffset)
        .text(featureName)
        .style('font-weight', 'bold')
        .style('font-size', TEXT_CONFIG.decision.featureFontSize);
    
    node.append('text')
        .attr('y', TEXT_CONFIG.decision.thresholdOffset)
        .text(`≤ ${d.data.threshold.toFixed(3)}`)
        .style('font-size', TEXT_CONFIG.decision.thresholdFontSize);
    
    node.append('text')
        .attr('y', TEXT_CONFIG.decision.instanceOffset)
        .text(`Instance: ${instanceValue}`)
        .style('font-size', TEXT_CONFIG.decision.instanceFontSize);
    
    node.append('text')
        .attr('y', TEXT_CONFIG.decision.decisionOffset)
        .text(`→ ${decision}`)
        .style('font-size', TEXT_CONFIG.decision.decisionFontSize)
        .style('font-weight', 'bold');
    
    node.append('text')
        .attr('y', TEXT_CONFIG.decision.samplesOffset)
        .text(`Samples: ${d.data.n_samples}`)
        .style('font-size', TEXT_CONFIG.decision.samplesFontSize);
    
    node.append('text')
        .attr('y', TEXT_CONFIG.decision.impurityOffset)
        .text(`Impurity: ${d.data.impurity.toFixed(4)}`)
        .style('font-size', TEXT_CONFIG.decision.impurityFontSize);
}

function showTooltip(event, d, instanceData) {
    const tooltip = d3.select('.tooltip');
    let content = '';
    
    if (d.data.is_leaf) {
        content = `
            <strong>Leaf Node</strong><br>
            Class: ${d.data.class_label}<br>
            Samples: ${d.data.n_samples}<br>
            Class Distribution: [${d.data.value.join(', ')}]
        `;
    } else {
        const instanceValue = instanceData[d.data.feature_name];
        const decision = instanceValue <= d.data.threshold ? 'LEFT' : 'RIGHT';
        
        content = `
            <strong>Decision Node</strong><br>
            Feature: ${d.data.feature_name.replace(/_/g, ' ')}<br>
            Threshold: ≤ ${d.data.threshold.toFixed(3)}<br>
            Instance Value: ${instanceValue}<br>
            Decision: Go ${decision}<br>
            Samples: ${d.data.n_samples}<br>
            Impurity: ${d.data.impurity.toFixed(4)}
        `;
    }
    
    tooltip.html(content)
        .style('left', (event.pageX + 10) + 'px')
        .style('top', (event.pageY - 10) + 'px')
        .style('opacity', 1);
}

function hideTooltip() {
    d3.select('.tooltip').style('opacity', 0);
}