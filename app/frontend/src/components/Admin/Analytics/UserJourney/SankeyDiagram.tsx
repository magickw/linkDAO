import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

// Type-only import to avoid runtime issues
type SankeyLayout<N, L> = {
  (graph: { nodes: N[]; links: L[] }): { nodes: N[]; links: L[] };
  nodeWidth(): number;
  nodeWidth(width: number): SankeyLayout<N, L>;
  nodePadding(): number;
  nodePadding(padding: number): SankeyLayout<N, L>;
  extent(): [[number, number], [number, number]];
  extent(extent: [[number, number], [number, number]]): SankeyLayout<N, L>;
};

// Fallback implementation for d3-sankey
const createSankey = <N, L>(): SankeyLayout<N, L> => {
  let nodeWidth = 24;
  let nodePadding = 8;
  let extent: [[number, number], [number, number]] = [[0, 0], [1, 1]];

  const sankey = ((graph: { nodes: N[]; links: L[] }) => {
    // Simple fallback layout - just return the input
    return { nodes: graph.nodes, links: graph.links };
  }) as SankeyLayout<N, L>;

  // Create properly typed functions for nodeWidth
  function nodeWidthFn(): number;
  function nodeWidthFn(width: number): SankeyLayout<N, L>;
  function nodeWidthFn(width?: number): number | SankeyLayout<N, L> {
    if (width === undefined) return nodeWidth;
    nodeWidth = width;
    return sankey;
  }
  sankey.nodeWidth = nodeWidthFn;

  // Create properly typed functions for nodePadding
  function nodePaddingFn(): number;
  function nodePaddingFn(padding: number): SankeyLayout<N, L>;
  function nodePaddingFn(padding?: number): number | SankeyLayout<N, L> {
    if (padding === undefined) return nodePadding;
    nodePadding = padding;
    return sankey;
  }
  sankey.nodePadding = nodePaddingFn;

  // Create properly typed functions for extent
  function extentFn(): [[number, number], [number, number]];
  function extentFn(extent: [[number, number], [number, number]]): SankeyLayout<N, L>;
  function extentFn(ext?: [[number, number], [number, number]]): [[number, number], [number, number]] | SankeyLayout<N, L> {
    if (ext === undefined) return extent;
    extent = ext;
    return sankey;
  }
  sankey.extent = extentFn;

  return sankey;
};

// Fallback link path generator
const createSankeyLinkHorizontal = () => {
  return (d: any) => {
    const x0 = d.source?.x1 || 0;
    const x1 = d.target?.x0 || 100;
    const y0 = d.source?.y0 || 0;
    const y1 = d.target?.y0 || 0;
    return `M${x0},${y0}L${x1},${y1}`;
  };
};

interface SankeyNode {
  id: string;
  name: string;
  value: number;
  category?: string;
}

interface SankeyLink {
  source: string;
  target: string;
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
    const sankeyGenerator = createSankey<SankeyNode, SankeyLink>()
      .nodeWidth(15)
      .nodePadding(10)
      .extent([[1, 1], [innerWidth - 1, innerHeight - 5]]);

    // Process data
    const processedData = {
      nodes: data.nodes.map(d => ({ ...d })),
      links: data.links.map(d => ({ ...d }))
    };

    const { nodes, links } = sankeyGenerator(processedData);

    // Color scale for nodes
    const colorScale = d3.scaleOrdinal(d3.schemeCategory10);

    // Draw links
    const link = g
      .append('g')
      .selectAll('.link')
      .data(links)
      .enter()
      .append('path')
      .attr('class', 'link')
      .attr('d', createSankeyLinkHorizontal())
      .style('stroke', (d: any) => colorScale(d.source.category || 'default'))
      .style('stroke-opacity', 0.5)
      .style('stroke-width', (d: any) => Math.max(1, d.width))
      .style('fill', 'none')
      .style('cursor', 'pointer')
      .on('mouseover', function(event: MouseEvent, d: any) {
        d3.select(this).style('stroke-opacity', 0.8);
        
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          content: `${d.source.name} → ${d.target.name}\nUsers: ${d.value.toLocaleString()}\nConversion: ${((d.value / d.source.value) * 100).toFixed(1)}%`
        });
      })
      .on('mouseout', function() {
        d3.select(this).style('stroke-opacity', 0.5);
        setTooltip(prev => ({ ...prev, visible: false }));
      })
      .on('click', (event: MouseEvent, d: any) => {
        if (onLinkClick) {
          onLinkClick({
            source: d.source.id,
            target: d.target.id,
            value: d.value
          });
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
      .attr('width', sankeyGenerator.nodeWidth())
      .style('fill', (d: any) => colorScale(d.category || 'default'))
      .style('stroke', '#000')
      .style('stroke-width', 0.5)
      .on('mouseover', function(event: MouseEvent, d: any) {
        d3.select(this).style('fill-opacity', 0.8);
        
        const rect = svgRef.current!.getBoundingClientRect();
        setTooltip({
          visible: true,
          x: event.clientX - rect.left,
          y: event.clientY - rect.top,
          content: `${d.name}\nUsers: ${d.value.toLocaleString()}\nConversion Rate: ${d.conversionRate ? d.conversionRate.toFixed(1) + '%' : 'N/A'}`
        });
      })
      .on('mouseout', function() {
        d3.select(this).style('fill-opacity', 1);
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
      .attr('x', -6)
      .attr('y', (d: any) => (d.y1 - d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .text((d: any) => d.name)
      .style('font-family', 'Arial, sans-serif')
      .style('font-size', '12px')
      .style('fill', '#333')
      .filter((d: any) => d.x0 < innerWidth / 2)
      .attr('x', sankeyGenerator.nodeWidth() + 6)
      .attr('text-anchor', 'start');

    // Add value labels on nodes
    node
      .append('text')
      .attr('x', sankeyGenerator.nodeWidth() / 2)
      .attr('y', (d: any) => (d.y1 - d.y0) / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'middle')
      .text((d: any) => d.value.toLocaleString())
      .style('font-family', 'Arial, sans-serif')
      .style('font-size', '10px')
      .style('fill', 'white')
      .style('font-weight', 'bold')
      .filter((d: any) => (d.y1 - d.y0) > 20); // Only show if node is tall enough

  }, [data, width, height, onNodeClick, onLinkClick]);

  return (
    <div className={`relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="border border-gray-200 rounded-lg bg-white"
      />
      
      {tooltip.visible && (
        <div
          className="absolute z-10 px-3 py-2 text-sm text-white bg-gray-900 rounded-lg shadow-lg pointer-events-none whitespace-pre-line"
          style={{
            left: tooltip.x + 10,
            top: tooltip.y - 10,
            transform: 'translateY(-100%)'
          }}
        >
          {tooltip.content}
        </div>
      )}
    </div>
  );
};

export default SankeyDiagram;