import React, { useState } from 'react';
import { Plus, Trash2, Copy, Grid, Table } from 'lucide-react';
import { Button } from '@/design-system/components/Button';

export interface SizeChartData {
  template: 'custom' | 'us_clothing' | 'eu_clothing' | 'us_shoes' | 'eu_shoes';
  columns: string[];
  rows: { [key: string]: string }[];
  unit: 'in' | 'cm';
}

interface SizeChartBuilderProps {
  value: SizeChartData;
  onChange: (data: SizeChartData) => void;
}

const TEMPLATES = {
  us_clothing: {
    columns: ['Size', 'Chest (in)', 'Waist (in)', 'Hips (in)'],
    rows: [
      { Size: 'XS', 'Chest (in)': '30-32', 'Waist (in)': '24-26', 'Hips (in)': '30-32' },
      { Size: 'S', 'Chest (in)': '34-36', 'Waist (in)': '28-30', 'Hips (in)': '34-36' },
      { Size: 'M', 'Chest (in)': '38-40', 'Waist (in)': '32-34', 'Hips (in)': '38-40' },
      { Size: 'L', 'Chest (in)': '42-44', 'Waist (in)': '36-38', 'Hips (in)': '42-44' },
      { Size: 'XL', 'Chest (in)': '46-48', 'Waist (in)': '40-42', 'Hips (in)': '46-48' },
      { Size: 'XXL', 'Chest (in)': '50-52', 'Waist (in)': '44-46', 'Hips (in)': '50-52' }
    ]
  },
  eu_clothing: {
    columns: ['Size', 'Chest (cm)', 'Waist (cm)', 'Hips (cm)'],
    rows: [
      { Size: 'XS', 'Chest (cm)': '76-82', 'Waist (cm)': '60-66', 'Hips (cm)': '76-82' },
      { Size: 'S', 'Chest (cm)': '86-92', 'Waist (cm)': '70-76', 'Hips (cm)': '86-92' },
      { Size: 'M', 'Chest (cm)': '96-102', 'Waist (cm)': '80-86', 'Hips (cm)': '96-102' },
      { Size: 'L', 'Chest (cm)': '106-112', 'Waist (cm)': '90-96', 'Hips (cm)': '106-112' },
      { Size: 'XL', 'Chest (cm)': '116-122', 'Waist (cm)': '100-106', 'Hips (cm)': '116-122' },
      { Size: 'XXL', 'Chest (cm)': '126-132', 'Waist (cm)': '110-116', 'Hips (cm)': '126-132' }
    ]
  },
  uk_clothing: {
    columns: ['Size', 'Chest (in)', 'Waist (in)', 'Hips (in)'],
    rows: [
      { Size: '6', 'Chest (in)': '30', 'Waist (in)': '23.5', 'Hips (in)': '32.5' },
      { Size: '8', 'Chest (in)': '31', 'Waist (in)': '24.5', 'Hips (in)': '33.5' },
      { Size: '10', 'Chest (in)': '32', 'Waist (in)': '25.5', 'Hips (in)': '34.5' },
      { Size: '12', 'Chest (in)': '34', 'Waist (in)': '27', 'Hips (in)': '36' },
      { Size: '14', 'Chest (in)': '36', 'Waist (in)': '28.5', 'Hips (in)': '37.5' },
      { Size: '16', 'Chest (in)': '38', 'Waist (in)': '30.5', 'Hips (in)': '39.5' },
      { Size: '18', 'Chest (in)': '40', 'Waist (in)': '32.5', 'Hips (in)': '41.5' },
      { Size: '20', 'Chest (in)': '42', 'Waist (in)': '34.5', 'Hips (in)': '43.5' }
    ]
  },
  asian_clothing: {
    columns: ['Size', 'Chest (cm)', 'Waist (cm)', 'Hips (cm)'],
    rows: [
      { Size: 'XS', 'Chest (cm)': '78-82', 'Waist (cm)': '62-66', 'Hips (cm)': '80-84' },
      { Size: 'S', 'Chest (cm)': '84-88', 'Waist (cm)': '68-72', 'Hips (cm)': '86-90' },
      { Size: 'M', 'Chest (cm)': '90-94', 'Waist (cm)': '74-78', 'Hips (cm)': '92-96' },
      { Size: 'L', 'Chest (cm)': '96-100', 'Waist (cm)': '80-84', 'Hips (cm)': '98-102' },
      { Size: 'XL', 'Chest (cm)': '102-106', 'Waist (cm)': '86-90', 'Hips (cm)': '104-108' },
      { Size: 'XXL', 'Chest (cm)': '108-112', 'Waist (cm)': '92-96', 'Hips (cm)': '110-114' }
    ]
  },
  us_shoes: {
    columns: ['US Size', 'EU Size', 'UK Size', 'Length (in)', 'Length (cm)'],
    rows: [
      { 'US Size': '6', 'EU Size': '39', 'UK Size': '5.5', 'Length (in)': '9.25', 'Length (cm)': '23.5' },
      { 'US Size': '7', 'EU Size': '40', 'UK Size': '6', 'Length (in)': '9.6', 'Length (cm)': '24.4' },
      { 'US Size': '8', 'EU Size': '41', 'UK Size': '7', 'Length (in)': '10', 'Length (cm)': '25.4' },
      { 'US Size': '9', 'EU Size': '42', 'UK Size': '8', 'Length (in)': '10.2', 'Length (cm)': '25.9' },
      { 'US Size': '10', 'EU Size': '43', 'UK Size': '9', 'Length (in)': '10.6', 'Length (cm)': '26.9' },
      { 'US Size': '11', 'EU Size': '44', 'UK Size': '10', 'Length (in)': '11', 'Length (cm)': '27.9' },
      { 'US Size': '12', 'EU Size': '45', 'UK Size': '11', 'Length (in)': '11.4', 'Length (cm)': '28.9' }
    ]
  },
  asian_shoes: {
    columns: ['Asian Size', 'US Size', 'EU Size', 'Length (cm)'],
    rows: [
      { 'Asian Size': '235', 'US Size': '5', 'EU Size': '38', 'Length (cm)': '23.5' },
      { 'Asian Size': '240', 'US Size': '6', 'EU Size': '39', 'Length (cm)': '24' },
      { 'Asian Size': '245', 'US Size': '6.5', 'EU Size': '39.5', 'Length (cm)': '24.5' },
      { 'Asian Size': '250', 'US Size': '7', 'EU Size': '40', 'Length (cm)': '25' },
      { 'Asian Size': '255', 'US Size': '7.5', 'EU Size': '40.5', 'Length (cm)': '25.5' },
      { 'Asian Size': '260', 'US Size': '8', 'EU Size': '41', 'Length (cm)': '26' },
      { 'Asian Size': '265', 'US Size': '8.5', 'EU Size': '41.5', 'Length (cm)': '26.5' },
      { 'Asian Size': '270', 'US Size': '9', 'EU Size': '42', 'Length (cm)': '27' },
      { 'Asian Size': '275', 'US Size': '9.5', 'EU Size': '42.5', 'Length (cm)': '27.5' },
      { 'Asian Size': '280', 'US Size': '10', 'EU Size': '43', 'Length (cm)': '28' },
      { 'Asian Size': '285', 'US Size': '10.5', 'EU Size': '43.5', 'Length (cm)': '28.5' },
      { 'Asian Size': '290', 'US Size': '11', 'EU Size': '44', 'Length (cm)': '29' }
    ]
  }
};

export const SizeChartBuilder: React.FC<SizeChartBuilderProps> = ({ value, onChange }) => {
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');

  const applyTemplate = (templateKey: keyof typeof TEMPLATES) => {
    onChange({
      ...value,
      template: templateKey,
      ...TEMPLATES[templateKey]
    });
  };

  const addRow = () => {
    const newRow: { [key: string]: string } = {};
    value.columns.forEach(col => newRow[col] = '');
    onChange({ ...value, rows: [...value.rows, newRow] });
  };

  const removeRow = (index: number) => {
    const newRows = [...value.rows];
    newRows.splice(index, 1);
    onChange({ ...value, rows: newRows });
  };

  const updateCell = (rowIndex: number, column: string, val: string) => {
    const newRows = [...value.rows];
    newRows[rowIndex] = { ...newRows[rowIndex], [column]: val };
    onChange({ ...value, rows: newRows });
  };

  const addColumn = () => {
    const colName = prompt('Enter column name (e.g., Inseam):');
    if (colName && !value.columns.includes(colName)) {
      const newColumns = [...value.columns, colName];
      const newRows = value.rows.map(row => ({ ...row, [colName]: '' }));
      onChange({ ...value, columns: newColumns, rows: newRows });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-white/90">Size Chart</label>
        <div className="flex bg-white/10 rounded-lg p-1">
          <button
            type="button"
            onClick={() => setActiveTab('editor')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${activeTab === 'editor' ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white'}`}
          >
            Editor
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${activeTab === 'preview' ? 'bg-indigo-600 text-white' : 'text-white/60 hover:text-white'}`}
          >
            Preview
          </button>
        </div>
      </div>

      {activeTab === 'editor' ? (
        <div className="space-y-4">
          {/* Templates */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <button
              type="button"
              onClick={() => applyTemplate('us_clothing')}
              className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 whitespace-nowrap"
            >
              US Clothing
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('eu_clothing')}
              className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 whitespace-nowrap"
            >
              EU Clothing
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('uk_clothing')}
              className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 whitespace-nowrap"
            >
              UK Clothing
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('asian_clothing')}
              className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 whitespace-nowrap"
            >
              Asian Clothing
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('us_shoes')}
              className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 whitespace-nowrap"
            >
              US Shoes
            </button>
            <button
              type="button"
              onClick={() => applyTemplate('asian_shoes')}
              className="px-3 py-1.5 text-xs bg-white/10 border border-white/20 rounded-full text-white/80 hover:bg-white/20 whitespace-nowrap"
            >
              Asian Shoes
            </button>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left text-white/80">
                <thead className="text-xs text-white/60 uppercase bg-white/10">
                  <tr>
                    {value.columns.map((col, idx) => (
                      <th key={idx} className="px-4 py-3">{col}</th>
                    ))}
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {value.rows.map((row, rIdx) => (
                    <tr key={rIdx} className="border-b border-white/5 last:border-0 hover:bg-white/5">
                      {value.columns.map((col, cIdx) => (
                        <td key={cIdx} className="px-2 py-2">
                          <input
                            type="text"
                            value={row[col] || ''}
                            onChange={(e) => updateCell(rIdx, col, e.target.value)}
                            className="w-full bg-transparent border-none focus:ring-0 p-1 text-white"
                          />
                        </td>
                      ))}
                      <td className="px-2 py-2 text-center">
                        <button
                          type="button"
                          onClick={() => removeRow(rIdx)}
                          className="text-white/40 hover:text-red-400"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="p-3 bg-white/5 flex gap-2">
              <button
                type="button"
                onClick={addRow}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white rounded transition-colors"
              >
                <Plus size={12} /> Add Row
              </button>
              <button
                type="button"
                onClick={addColumn}
                className="flex items-center gap-1 px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20 text-white rounded transition-colors"
              >
                <Grid size={12} /> Add Column
              </button>
            </div>
          </div>
        </div>
      ) : (
        // Preview Mode
        <div className="bg-white/5 border border-white/10 rounded-lg p-4">
          <h4 className="text-sm font-medium text-white mb-4">Size Chart ({value.unit})</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left text-white">
              <thead className="text-xs text-white/60 uppercase bg-white/10">
                <tr>
                  {value.columns.map((col, idx) => (
                    <th key={idx} className="px-6 py-3">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {value.rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-white/10 last:border-0">
                    {value.columns.map((col, cIdx) => (
                      <td key={cIdx} className="px-6 py-4 font-medium">
                        {row[col]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default SizeChartBuilder;
