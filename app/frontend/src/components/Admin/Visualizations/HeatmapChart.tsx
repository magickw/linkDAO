import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { HeatmapProps, HeatmapData } from './types';
import { d3ColorScales, adminColors } from './theme';

const HeatmapChart: React.FC<HeatmapProps> = ({
  data,
  width = 600,
  height = 400,
  colorScale = d3ColorScales.sequential.blue,
  showTooltip = true,
  onCellClick,
  className = '',
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  // Process and validate data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return { data: [], xLabels: [], yLabels: [], extent: [0, 0] };

    const xLabels = Array.from(new Set(data.map(d => d.x.toString()))).sort();
    const yLabels = Array.from(new Set(data.map(d => d.y.toString()))).sort();
    const values = data.map(d => d.value);
    const extent = d3.extent(values) as [number, number];

    return {
      data,
      xLabels,
      yLabels,
      extent,
    };
  }, [data]);

  useEffect(() => {
    if (!svgRef.current || processedData.data.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous render

    const margin = { top: 40, right: 40, bottom: 60, left: 80 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Create main group
    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Create scales
    const xScale = d3
      .scaleBand()
      .domain(processedData.xLabels)
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = d3
      .scaleBand()
      .domain(processedData.yLabels)
      .range([0, innerHeight])
      .padding(0.1);

    const colorScaleFunc = d3
      .scaleSequential()
      .interpolator(d3.interpolateBlues)
      .domain(processedData.extent);

    // Create tooltip
    let tooltip: d3.Selection<HTMLDivElement, unknown, null, undefined>;
    if (showTooltip && tooltipRef.current) {
      tooltip = d3.select(tooltipRef.current);
    }

    // Draw heatmap cells
    const cells = g
      .selectAll('.heatmap-cell')
      .data(processedData.data)
      .enter()
      .append('rect')
      .attr('class', 'heatmap-cell')
      .attr('x', d => xScale(d.x.toString()) || 0)
      .attr('y', d => yScale(d.y.toString()) || 0)
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', d => colorScaleFunc(d.value))
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1)
      .attr('rx', 2)
      .style('cursor', onCellClick ? 'pointer' : 'default')
      .style('opacity', 0);

    // Add cell interactions
    if (showTooltip || onCellClick) {
      cells
        .on('mouseover', function(event: MouseEvent, d: HeatmapData) {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke-width', 2)
            .attr('stroke', adminColors.primary[0]);

          if (showTooltip && tooltip) {
            tooltip
              .style('opacity', 1)
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px')
              .html(`
                <div class="font-semibold">${d.label || `${d.x}, ${d.y}`}</div>
                <div class="text-sm text-gray-600">Value: ${d.value.toLocaleString()}</div>
              `);
          }
        })
        .on('mousemove', function(event: MouseEvent) {
          if (showTooltip && tooltip) {
            tooltip
              .style('left', (event.pageX + 10) + 'px')
              .style('top', (event.pageY - 10) + 'px');
          }
        })
        .on('mouseout', function() {
          d3.select(this)
            .transition()
            .duration(200)
            .attr('stroke-width', 1)
            .attr('stroke', '#ffffff');

          if (showTooltip && tooltip) {
            tooltip.style('opacity', 0);
          }
        })
        .on('click', function(event: MouseEvent, d: HeatmapData) {
          if (onCellClick) {
            onCellClick(d);
          }
        });
    }

    // Animate cells in
    cells
      .transition()
      .duration(750)
      .style('opacity', 1);

    // Add value labels on cells (for smaller datasets)
    if (processedData.data.length <= 100) {
      g.selectAll('.cell-label')
        .data(processedData.data)
        .enter()
        .append('text')
        .attr('class', 'cell-label')
        .attr('x', d => (xScale(d.x.toString()) || 0) + xScale.bandwidth() / 2)
        .attr('y', d => (yScale(d.y.toString()) || 0) + yScale.bandwidth() / 2)
        .attr('text-anchor', 'middle')
        .attr('dominant-baseline', 'middle')
        .style('font-size', '10px')
        .style('font-weight', '500')
        .style('fill', d => d.value > (processedData.extent[0] + processedData.extent[1]) / 2 ? '#ffffff' : '#374151')
        .style('pointer-events', 'none')
        .style('opacity', 0)
        .text(d => d.value.toLocaleString())
        .transition()
        .delay(500)
        .duration(500)
        .style('opacity', 1);
    }

    // Add X axis
    const xAxis = g
      .append('g')
      .attr('class', 'x-axis')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6B7280');

    // Add Y axis
    const yAxis = g
      .append('g')
      .attr('class', 'y-axis')
      .call(d3.axisLeft(yScale))
      .selectAll('text')
      .style('font-size', '12px')
      .style('fill', '#6B7280');

    // Add color legend
    const legendWidth = 200;
    const legendHeight = 10;
    const legendX = innerWidth - legendWidth;
    const legendY = -30;

    const legendScale = d3
      .scaleLinear()
      .domain(processedData.extent)
      .range([0, legendWidth]);

    const legendAxis = d3
      .axisBottom(legendScale)
      .ticks(5)
      .tickSize(3);

    const legend = g
      .append('g')
      .attr('class', 'legend')
      .attr('transform', `translate(${legendX},${legendY})`);

    // Create gradient for legend
    const gradient = svg
      .append('defs')
      .append('linearGradient')
      .attr('id', 'heatmap-gradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .attr('y1', '0%')
      .attr('y2', '0%');

    const steps = 10;
    for (let i = 0; i <= steps; i++) {
      const value = processedData.extent[0] + (i / steps) * (processedData.extent[1] - processedData.extent[0]);
      gradient
        .append('stop')
        .attr('offset', `${(i / steps) * 100}%`)
        .attr('stop-color', colorScaleFunc(value));
    }

    legend
      .append('rect')
      .attr('width', legendWidth)
      .attr('height', legendHeight)
      .style('fill', 'url(#heatmap-gradient)')
      .attr('stroke', '#E5E7EB')
      .attr('stroke-width', 1);

    legend
      .append('g')
      .attr('transform', `translate(0,${legendHeight})`)
      .call(legendAxis)
      .selectAll('text')
      .style('font-size', '10px')
      .style('fill', '#6B7280');

  }, [processedData, width, height, colorScale, showTooltip, onCellClick]);

  return (
    <div className={`heatmap-container relative ${className}`}>
      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="heatmap-svg"
      />
      {showTooltip && (
        <div
          ref={tooltipRef}
          className="absolute pointer-events-none bg-white border border-gray-200 rounded-lg shadow-lg p-2 text-sm opacity-0 transition-opacity duration-200 z-10"
        />
      )}
    </div>
  );
};

export default HeatmapChart;