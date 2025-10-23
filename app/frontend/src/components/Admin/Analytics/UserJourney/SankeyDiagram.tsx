import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal } from 'd3-sankey';

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  category?: string;
}

interface SankeyLink {
  source: SankeyNode | number;
  target: SankeyNode | number;
  value: number;
}

interface SankeyData {
  nodes: SankeyNode[];
  links: SankeyLink[];
}

interface SankeyDiagramProps {
  data: SankeyData;
  width?: number;
  height?: number;
  className?: string;
  onNodeClick?: (node: SankeyNode) => void;
  onLinkClick?: (link: SankeyLink) => void;
}

export const SankeyDiagram: React.FC<SankeyDiagramProps> = ({
  data,
  width = 800,
  height = 400,
  className = '',
  onNodeClick,
  onLinkClick
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [tooltip, setTooltip] = useState<{
    visible: boolean;
    x: number;
    y: number;
    content: string;
  }>({
    visible: false,
    x: 0,
    y: 0,
    content: ''
  });

  useEffect(() => {
    if (!svgRef.current || !data.nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create sankey generator
    const sankeyGenerator = sankey<SankeyNode, SankeyLink>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 5]]);

    // Process data
    const { nodes, links } = sankeyGenerator({
      nodes: data.nodes.map((d, i) => ({ ...d, index: i })),
      links: data.links.map(d => ({ ...d }))
    });

    // Color scale for nodes
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw links
    const link = g
      .append('g')
      .attr('fill', 'none')
      .attr('stroke-opacity', 0.5)
      .selectAll('path')
      .data(links)
      .enter()
      .append('path')
      .attr('d', sankeyLinkHorizontal())
      .attr('stroke', (d: any) => colorScale((d.source as SankeyNode).category || 'default'))
      .attr('stroke-width', (d: any) => Math.max(1, d.width))
      .style('cursor', 'pointer')
      .on('mouseover', function(event: MouseEvent, d: any) {
        d3.select(this).attr('stroke-opacity', 0.8);
        
        const rect = svgRef.current!.getBoundingClientRect();
        const sourceNode = d.source as SankeyNode;
        const targetNode = d.target as SankeyNode;
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          content: `${sourceNode.name} → ${targetNode.name}\nUsers: ${d.value.toLocaleString()}\nConversion: ${sourceNode.value ? ((d.value / sourceNode.value) * 100).toFixed(1) + '%' : 'N/A'}`
        });
      })
      .on('mouseout', function() {
        d3.select(this).attr('stroke-opacity', 0.5);
        setTooltip(prev => ({ ...prev, visible: false }));
      })
      .on('click', (event: MouseEvent, d: any) => {
        if (onLinkClick) {
          onLinkClick(d);
        }
      });

    // Draw nodes
    const node = g
      .append('g')
      .selectAll('.node')
      .data(nodes)
      .enter()
      .append('g')
      .attr('class', 'node')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer');

    // Node rectangles
    node
      .append('rect')
      .attr('height', (d: any) => d.y1 - d.y0)
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('fill', (d: any) => colorScale(d.category || 'default'))
      .attr('stroke', '#000')
      .attr('stroke-width', 0.5)
      .on('mouseover', function(event: MouseEvent, d: any) {
        d3.select(this).attr('fill-opacity', 0.8);
        
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          content: `${d.name}\nUsers: ${d.value.toLocaleString()}\nConversion Rate: ${d.conversionRate ? d.conversionRate.toFixed(1) + '%' : 'N/A'}`
        });
      })
      .on('mouseout', function() {
        d3.select(this).attr('fill-opacity', 1);
        setTooltip(prev => ({ ...prev, visible: false }));
      })
      .on('click', (event: MouseEvent, d: any) => {
        if (onNodeClick) {
          onNodeClick(d);
        }
      });

    // Node labels
    node
      .append('text')
      .attr('x', (d: any) => (d.x0 < width / 2 ? (d.x1 - d.x0) + 6 : -6))
      .attr('y', (d: any) => (d.y1 - d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', (d: any) => (d.x0 < width / 2 ? 'start' : 'end'))
      .attr('font-size', '10px')
      .text((d: any) => d.name);

  }, [data, width, height, onNodeClick, onLinkClick]);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded-lg"
      />
      {tooltip.visible && (
        <div
          className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm z-10"
          style={{
            left: `${tooltip.x + 10}px`,
            top: `${tooltip.y - 10}px`,
            opacity: tooltip.visible ? 1 : 0,
            transition: 'opacity 0.2s'
          }}
        >
          <pre className="font-sans whitespace-pre-wrap">{tooltip.content}</pre>
        </div>
      )}
    </div>
  );
};

export default SankeyDiagram;