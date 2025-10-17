import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { TreemapProps, TreemapData, TreemapNode } from './types';
import { adminColors } from './theme';

const TreemapChart: React.FC<TreemapProps> = ({
  data,
  width = 600,
  height = 400,
  colorScale = adminColors.primary,
  showLabels = true,
  onNodeClick,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Process hierarchical data
  const processedData = useMemo(() => {
    if (!data) return null;

    const hierarchy = d3.hierarchy(data)
      .sum(d => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    return hierarchy;
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || !processedData) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Create treemap layout
    const treemap = d3.treemap<TreemapData>()
      .size([width, height])
      .padding(2)
      .round(true);

    const root = treemap(processedData);

    // Color scale
    const colorScaleFunc = d3.scaleOrdinal()
      .domain(root.leaves().map(d => d.parent?.data.name || d.data.name))
      .range(colorScale);

    // Create tooltip
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
    if (tooltipRef.current) {
      tooltip = d3.select(tooltipRef.current);
    }

    // Draw leaf nodes
    const leaf = svg
      .selectAll('.treemap-node')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('class', 'treemap-node')
      .attr('transform', d => `translate(${d.x0},${d.y0})`);

    // Add rectangles
    leaf
      .append('rect')
      .attr('width', d => d.x1 - d.x0)
      .attr('height', d => d.y1 - d.y0)
      .attr('fill', d => d.data.color || colorScaleFunc(d.parent?.data.name || d.data.name))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('rx', 4)
      .style('cursor', onNodeClick ? 'pointer' : 'default')
      .style('opacity', 0)
      .transition()
      .duration(750)
      .delay((d, i) => i * 50)
      .style('opacity', 0.8)
      .on('end', function() {
        d3.select(this)
          .on('mouseover', function(event, d) {
            d3.select(this)
              .transition()
              .duration(200)
              .style('opacity', 1)
              .attr('stroke-width', 2)
              .attr('stroke', adminColors.neutral[700]);

            if (tooltip) {
              tooltip
                .style('opacity', 1)
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px')
                .html(`
                  <div class="font-semibold">${d.data.name}</div>
                  <div class="text-sm text-gray-600">Value: ${(d.value || 0).toLocaleString()}</div>
                  ${d.parent ? `<div class="text-xs text-gray-500">Parent: ${d.parent.data.name}</div>` : ''}
                `);
            }
          })
          .on('mousemove', function(event) {
            if (tooltip) {
              tooltip
                .style('left', (event.pageX + 10) + 'px')
                .style('top', (event.pageY - 10) + 'px');
            }
          })
          .on('mouseout', function() {
            d3.select(this)
              .transition()
              .duration(200)
              .style('opacity', 0.8)
              .attr('stroke-width', 1)
              .attr('stroke', '#ffffff');

            if (tooltip) {
              tooltip.style('opacity', 0);
            }
          })
          .on('click', function(event, d) {
            if (onNodeClick) {
              onNodeClick(d.data);
            }
          });
      });

    // Add labels
    if (showLabels) {
      leaf
        .append('text')
        .attr('class', 'treemap-label')
        .selectAll('tspan')
        .data(d => {
          const words = d.data.name.split(/\s+/);
          const rectWidth = d.x1 - d.x0;
          const rectHeight = d.y1 - d.y0;
          
          // Only show label if rectangle is large enough
          if (rectWidth < 60 || rectHeight < 30) return [];
          
          // Wrap text to fit in rectangle
          const maxCharsPerLine = Math.floor(rectWidth / 8);
          const lines: string[] = [];
          let currentLine = '';
          
          words.forEach(word => {
            if ((currentLine + word).length <= maxCharsPerLine) {
              currentLine += (currentLine ? ' ' : '') + word;
            } else {
              if (currentLine) lines.push(currentLine);
              currentLine = word;
            }
          });
          if (currentLine) lines.push(currentLine);
          
          return lines.slice(0, Math.floor(rectHeight / 16)); // Limit lines to fit height
        })
        .enter()
        .append('tspan')
        .attr('x', function() {
          const node = d3.select(this.parentNode as any).datum() as any;
          return (node.x1 - node.x0) / 2;
        })
        .attr('y', function(d, i) {
          const node = d3.select(this.parentNode as any).datum() as any;
          const rectHeight = node.y1 - node.y0;
          const totalLines = d3.select(this.parentNode as any).selectAll('tspan').size();
          const startY = (rectHeight - totalLines * 16) / 2 + 16;
          return startY + i * 16;
        })
        .attr('text-anchor', 'middle')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#374151')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .text(d => d)
        .transition()
        .delay(1000)
        .duration(500)
        .style('opacity', 1);

      // Add value labels for larger rectangles
      leaf
        .filter(d => (d.x1 - d.x0) > 80 && (d.y1 - d.y0) > 50)
        .append('text')
        .attr('class', 'treemap-value')
        .attr('x', d => (d.x1 - d.x0) / 2)
        .attr('y', d => (d.y1 - d.y0) - 8)
        .attr('text-anchor', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '400')
        .style('fill', '#6B7280')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .text(d => (d.value || 0).toLocaleString())
        .transition()
        .delay(1200)
        .duration(500)
        .style('opacity', 1);
    }

    // Add parent group labels
    const parents = root.descendants().filter(d => d.depth === 1);
    
    parents.forEach(parent => {
      if (!parent.children) return;
      
      const parentGroup = svg
        .append('g')
        .attr('class', 'treemap-parent-group');

      // Find bounding box of all children
      const minX = Math.min(...parent.children.map(d => d.x0));
      const maxX = Math.max(...parent.children.map(d => d.x1));
      const minY = Math.min(...parent.children.map(d => d.y0));
      const maxY = Math.max(...parent.children.map(d => d.y1));

      // Add parent label background
      parentGroup
        .append('rect')
        .attr('x', minX)
        .attr('y', minY - 20)
        .attr('width', maxX - minX)
        .attr('height', 18)
        .attr('fill', colorScaleFunc(parent.data.name))
        .attr('opacity', 0.1)
        .attr('rx', 2);

      // Add parent label text
      parentGroup
        .append('text')
        .attr('x', minX + 4)
        .attr('y', minY - 6)
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', colorScaleFunc(parent.data.name))
        .style('pointer-events', 'none')
        .text(parent.data.name)
        .style('opacity', 0)
        .transition()
        .delay(800)
        .duration(500)
        .style('opacity', 1);
    });

  }, [processedData, width, height, colorScale, showLabels, onNodeClick]);

  return (
    <div className={`treemap-container relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="treemap-svg"
      />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm opacity-0 transition-opacity duration-200 z-10"
      />
    </div>
  );
};

export default TreemapChart;