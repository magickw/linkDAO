import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { NetworkGraphProps, NetworkNode, NetworkLink } from './types';
import { adminColors } from './theme';

const NetworkGraph: React.FC<NetworkGraphProps> = ({
  nodes,
  links,
  width = 600,
  height = 400,
  onNodeClick,
  onLinkClick,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Process nodes and links data
  const processedData = useMemo(() => {
    if (!nodes || !links) return { nodes: [], links: [] };

    // Create a map for quick node lookup
    const nodeMap = new Map(nodes.map(node => [node.id, node]));

    // Validate links and add default properties
    const validLinks = links
      .filter(link => nodeMap.has(link.source) && nodeMap.has(link.target))
      .map(link => ({
        ...link,
        value: link.value || 1,
        color: link.color || adminColors.neutral[400],
      }));

    // Add default properties to nodes
    const processedNodes = nodes.map(node => ({
      ...node,
      size: node.size || 10,
      color: node.color || adminColors.primary[0],
      group: node.group || 'default',
    }));

    return {
      nodes: processedNodes,
      links: validLinks,
    };
  }, [nodes, links]);

  useEffect(() => {
    if (!svgRef.current || processedData.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    // Create main group
    const g = svg.append('g').attr('class', 'network-graph');

    // Create zoom behavior
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Create color scale for groups
    const groupColorScale = d3.scaleOrdinal()
      .domain(Array.from(new Set(processedData.nodes.map(d => d.group))))
      .range(adminColors.primary);

    // Create force simulation
    const simulation = d3.forceSimulation(processedData.nodes as any)
      .force('link', d3.forceLink(processedData.links as any)
        .id((d: any) => d.id)
        .distance(d => 50 + (d as any).value * 20)
        .strength(0.1)
      )
      .force('charge', d3.forceManyBody()
        .strength(-300)
        .distanceMax(200)
      )
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide()
        .radius((d: any) => d.size + 2)
      );

    // Create tooltip
    let tooltip: d3.Selection<HTMLDivElement, unknown, HTMLElement, any>;
    if (tooltipRef.current) {
      tooltip = d3.select(tooltipRef.current);
    }

    // Create arrow markers for directed links
    svg.append('defs')
      .selectAll('marker')
      .data(['arrow'])
      .enter()
      .append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', 15)
      .attr('refY', 0)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', adminColors.neutral[400]);

    // Draw links
    const link = g.selectAll('.link')
      .data(processedData.links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => Math.sqrt(d.value || 1) * 2)
      .attr('stroke-opacity', 0.6)
      .attr('marker-end', 'url(#arrow)')
      .style('cursor', onLinkClick ? 'pointer' : 'default')
      .style('opacity', 0)
      .transition()
      .duration(1000)
      .style('opacity', 1);

    // Add link interactions
    if (onLinkClick || tooltip) {
      link
        .on('mouseover', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke-opacity', 1)
            .attr('stroke-width', Math.sqrt(d.value || 1) * 3);

          if (tooltip) {
            tooltip
              .style('opacity', 1)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px')
              .html(`
                <div class="font-semibold">Connection</div>
                <div class="text-sm text-gray-600">From: ${d.source}</div>
                <div class="text-sm text-gray-600">To: ${d.target}</div>
                <div class="text-sm text-gray-600">Strength: ${d.value}</div>
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
        .on('mouseout', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke-opacity', 0.6)
            .attr('stroke-width', Math.sqrt(d.value || 1) * 2);

          if (tooltip) {
            tooltip.style('opacity', 0);
          }
        })
        .on('click', function(event, d) {
          if (onLinkClick) {
            onLinkClick(d);
          }
        });
    }

    // Draw nodes
    const node = g.selectAll('.node')
      .data(processedData.nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .style('cursor', onNodeClick ? 'pointer' : 'grab')
      .call(d3.drag<any, any>()
        .on('start', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        })
      );

    // Add node circles
    node.append('circle')
      .attr('r', d => d.size)
      .attr('fill', d => d.color || groupColorScale(d.group))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 2)
      .style('opacity', 0)
      .transition()
      .duration(1000)
      .delay((d, i) => i * 50)
      .style('opacity', 1);

    // Add node labels
    node.append('text')
      .attr('class', 'node-label')
      .attr('dx', d => d.size + 5)
      .attr('dy', '.35em')
      .style('font-size', '11px')
      .style('font-weight', '500')
      .style('fill', '#374151')
      .style('pointer-events', 'none')
      .text(d => d.label)
      .style('opacity', 0)
      .transition()
      .delay(1200)
      .duration(500)
      .style('opacity', 1);

    // Add node interactions
    if (onNodeClick || tooltip) {
      node
        .on('mouseover', function(event, d) {
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', d.size * 1.2)
            .attr('stroke-width', 3);

          // Highlight connected links
          link
            .transition()
            .duration(200)
            .attr('stroke-opacity', l => 
              (l.source as any).id === d.id || (l.target as any).id === d.id ? 1 : 0.2
            );

          if (tooltip) {
            tooltip
              .style('opacity', 1)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px')
              .html(`
                <div class="font-semibold">${d.label}</div>
                <div class="text-sm text-gray-600">ID: ${d.id}</div>
                <div class="text-sm text-gray-600">Group: ${d.group}</div>
                <div class="text-sm text-gray-600">Size: ${d.size}</div>
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
        .on('mouseout', function(event, d) {
          d3.select(this).select('circle')
            .transition()
            .duration(200)
            .attr('r', d.size)
            .attr('stroke-width', 2);

          // Reset link opacity
          link
            .transition()
            .duration(200)
            .attr('stroke-opacity', 0.6);

          if (tooltip) {
            tooltip.style('opacity', 0);
          }
        })
        .on('click', function(event, d) {
          if (onNodeClick) {
            onNodeClick(d);
          }
        });
    }

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('transform', (d: any) => `translate(${d.x},${d.y})`);
    });

    // Add legend for groups
    const groups = Array.from(new Set(processedData.nodes.map(d => d.group)));
    if (groups.length > 1) {
      const legend = svg.append('g')
        .attr('class', 'legend')
        .attr('transform', `translate(20, 20)`);

      const legendItems = legend.selectAll('.legend-item')
        .data(groups)
        .enter()
        .append('g')
        .attr('class', 'legend-item')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`);

      legendItems.append('circle')
        .attr('r', 6)
        .attr('fill', d => groupColorScale(d))
        .attr('stroke', '#ffffff')
        .attr('stroke-width', 1);

      legendItems.append('text')
        .attr('x', 15)
        .attr('y', 0)
        .attr('dy', '.35em')
        .style('font-size', '12px')
        .style('font-weight', '500')
        .style('fill', '#374151')
        .text(d => d);
    }

    // Cleanup function
    return () => {
      simulation.stop();
    };

  }, [processedData, width, height, onNodeClick, onLinkClick]);

  return (
    <div className={`network-graph-container relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="network-graph-svg border border-gray-200 rounded-lg"
      />
      <div
        ref={tooltipRef}
        className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm opacity-0 transition-opacity duration-200 z-10"
      />
      <div className="absolute top-2 right-2 text-xs text-gray-500 bg-white px-2 py-1 rounded border">
        Drag nodes • Zoom with mouse wheel
      </div>
    </div>
  );
};

export default NetworkGraph;