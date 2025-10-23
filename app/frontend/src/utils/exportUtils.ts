/**
 * Export utilities for analytics reports
 * Supports CSV and PDF export functionality
 */

export interface ExportData {
  headers: string[];
  rows: (string | number)[][];
  title?: string;
  metadata?: Record<string, string>;
}

/**
 * Export data to CSV format
 */
export function exportToCSV(data: ExportData, filename: string = 'export.csv'): void {
  const { headers, rows, metadata } = data;

  let csvContent = '';

  // Add metadata if provided
  if (metadata) {
    Object.entries(metadata).forEach(([key, value]) => {
      csvContent += `# ${key}: ${value}\n`;
    });
    csvContent += '\n';
  }

  // Add headers
  csvContent += headers.map(h => `"${h}"`).join(',') + '\n';

  // Add rows
  rows.forEach(row => {
    csvContent += row.map(cell => {
      const cellStr = String(cell);
      // Escape quotes and wrap in quotes if contains comma or quote
      if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
        return `"${cellStr.replace(/"/g, '""')}"`;
      }
      return cellStr;
    }).join(',') + '\n';
  });

  // Create download link
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Export data to PDF format
 * Uses jsPDF library - make sure to install: npm install jspdf jspdf-autotable
 */
export async function exportToPDF(data: ExportData, filename: string = 'export.pdf'): Promise<void> {
  try {
    // Dynamic import to avoid bundling if not used
    const jsPDF = (await import('jspdf')).default;
    const autoTable = (await import('jspdf-autotable')).default;

    const { headers, rows, title, metadata } = data;

    const doc = new jsPDF();
    let yPos = 20;

    // Add title
    if (title) {
      doc.setFontSize(18);
      doc.text(title, 14, yPos);
      yPos += 10;
    }

    // Add metadata
    if (metadata) {
      doc.setFontSize(10);
      Object.entries(metadata).forEach(([key, value]) => {
        doc.text(`${key}: ${value}`, 14, yPos);
        yPos += 6;
      });
      yPos += 4;
    }

    // Add table
    autoTable(doc, {
      head: [headers],
      body: rows,
      startY: yPos,
      theme: 'grid',
      styles: {
        fontSize: 9,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [59, 130, 246], // Blue
        fontStyle: 'bold',
      },
    });

    // Save PDF
    doc.save(filename);
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Failed to export to PDF. Please try CSV export instead.');
  }
}

/**
 * Format date for export
 */
export function formatDateForExport(date: Date | string): string {
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString().split('T')[0];
}

/**
 * Format number for export
 */
export function formatNumberForExport(num: number, decimals: number = 2): string {
  return num.toFixed(decimals);
}

/**
 * Prepare analytics data for export
 */
export function prepareAnalyticsForExport(analytics: any, timeRange: string): {
  summary: ExportData;
  tickets: ExportData;
  agents: ExportData;
  categories: ExportData;
} {
  const now = new Date();
  const metadata = {
    'Generated': now.toISOString(),
    'Time Range': timeRange,
    'Report Type': 'Support Analytics'
  };

  // Summary export
  const summary: ExportData = {
    headers: ['Metric', 'Value'],
    rows: [
      ['Total Tickets', analytics.summary.totalTickets],
      ['Tickets with Doc Views', analytics.summary.ticketsWithDocViews],
      ['Average Resolution Time (hours)', formatNumberForExport(analytics.summary.averageResolutionTime)],
      ['Documentation Effectiveness (%)', analytics.summary.documentationEffectiveness],
    ],
    title: 'Support Analytics Summary',
    metadata
  };

  // Tickets export
  const tickets: ExportData = {
    headers: ['Date', 'Total', 'Resolved', 'Pending'],
    rows: [], // Would be populated with actual ticket data
    title: 'Ticket Volume Over Time',
    metadata
  };

  // Agents export
  const agents: ExportData = {
    headers: ['Agent Name', 'Tickets Handled', 'Tickets Resolved', 'Avg Response Time (h)', 'Satisfaction Score'],
    rows: analytics.agentPerformance?.map((agent: any) => [
      agent.name,
      agent.ticketsHandled,
      agent.ticketsResolved,
      formatNumberForExport(agent.avgResponseTime),
      agent.satisfactionScore
    ]) || [],
    title: 'Agent Performance',
    metadata
  };

  // Categories export
  const categories: ExportData = {
    headers: ['Category', 'Count', 'Percentage'],
    rows: analytics.summary.topIssueCategories.map((cat: any) => [
      cat.category,
      cat.count,
      `${cat.percentage}%`
    ]),
    title: 'Ticket Categories',
    metadata
  };

  return { summary, tickets, agents, categories };
}
