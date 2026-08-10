import React, { useState, useEffect } from 'react';
import { Save } from 'lucide-react';
import Swal from 'sweetalert2';

const Formulas = ({ base_api }) => {
  const [loading, setLoading] = useState(false);
  const [hraPercentage, setHraPercentage] = useState('');
  const [bonusPercentage, setBonusPercentage] = useState('8.33');
  const [defaultWageSheetId, setDefaultWageSheetId] = useState(null);
  const [hraFormulaId, setHraFormulaId] = useState(null);
  const [bonusFormulaId, setBonusFormulaId] = useState(null);

  const token = localStorage.getItem("access") || localStorage.getItem("access_token") || localStorage.getItem("token") || "";

  useEffect(() => {
    setupDefaultConfig();
  }, []);

  const setupDefaultConfig = async () => {
    try {
      setLoading(true);
      // 1. Get or Create Default Company
      let companyRes = await fetch(`${base_api}/lead/companies/?search=Default Company`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let companyData = await companyRes.json();
      let companies = Array.isArray(companyData) ? companyData : companyData.results || [];
      
      let companyId;
      if (companies.length > 0) {
        companyId = companies[0].id;
      } else {
        const createCompRes = await fetch(`${base_api}/lead/companies/`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: 'Default Company' })
        });
        const newComp = await createCompRes.json();
        companyId = newComp.id;
      }

      // 2. Get or Create Default Wage Sheet
      let wsRes = await fetch(`${base_api}/lead/wage-sheets/?search=Default Wage Sheet&company=${companyId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let wsData = await wsRes.json();
      let wageSheets = Array.isArray(wsData) ? wsData : wsData.results || [];

      let wageSheetId;
      if (wageSheets.length > 0) {
        wageSheetId = wageSheets[0].id;
      } else {
        const createWsRes = await fetch(`${base_api}/lead/wage-sheets/`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ name: 'Default Wage Sheet', company: companyId })
        });
        const newWs = await createWsRes.json();
        wageSheetId = newWs.id;
      }
      
      setDefaultWageSheetId(wageSheetId);

      // 3. Get existing HRA formula
      let formulasRes = await fetch(`${base_api}/lead/payroll-formulas/?wage_sheet=${wageSheetId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let formulasData = await formulasRes.json();
      let formulas = Array.isArray(formulasData) ? formulasData : formulasData.results || [];
      
      const hraFormula = formulas.find(f => f.target_field === 'hra');
      if (hraFormula) {
        setHraFormulaId(hraFormula.id);
        setHraPercentage((parseFloat(hraFormula.percentage_or_value) * 100).toString());
      }
      
      const bonusFormula = formulas.find(f => f.target_field === 'bonus');
      if (bonusFormula) {
        setBonusFormulaId(bonusFormula.id);
        setBonusPercentage((parseFloat(bonusFormula.percentage_or_value) * 100).toString());
      }
    } catch (err) {
      console.error("Error setting up default config:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!defaultWageSheetId) {
      Swal.fire('Error', 'Configuration not initialized', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // Save HRA Formula
      const hraVal = parseFloat(hraPercentage) / 100;
      const hraPayload = {
        wage_sheet: defaultWageSheetId,
        target_field: 'hra',
        base_field: 'basic',
        operator: '*',
        percentage_or_value: hraVal
      };

      const hraUrl = hraFormulaId 
        ? `${base_api}/lead/payroll-formulas/${hraFormulaId}/`
        : `${base_api}/lead/payroll-formulas/`;
      const hraMethod = hraFormulaId ? 'PUT' : 'POST';

      const hraRes = await fetch(hraUrl, {
        method: hraMethod,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(hraPayload)
      });

      if (hraRes.ok) {
        const data = await hraRes.json();
        setHraFormulaId(data.id);
      } else {
        throw new Error("Failed to save HRA formula");
      }

      // Save Bonus Formula
      const bonusVal = parseFloat(bonusPercentage) / 100;
      const bonusPayload = {
        wage_sheet: defaultWageSheetId,
        target_field: 'bonus',
        base_field: 'basic',
        operator: '*',
        percentage_or_value: bonusVal
      };

      const bonusUrl = bonusFormulaId 
        ? `${base_api}/lead/payroll-formulas/${bonusFormulaId}/`
        : `${base_api}/lead/payroll-formulas/`;
      const bonusMethod = bonusFormulaId ? 'PUT' : 'POST';

      const bonusRes = await fetch(bonusUrl, {
        method: bonusMethod,
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(bonusPayload)
      });

      if (bonusRes.ok) {
        const data = await bonusRes.json();
        setBonusFormulaId(data.id);
      } else {
        throw new Error("Failed to save Bonus formula");
      }

      Swal.fire('Success', 'Formulas saved successfully', 'success');
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'An unexpected error occurred', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-lg shadow-sm border border-slate-200 mt-6 w-full lg:w-3/4">
      <div className="border-b border-slate-200 pb-4 mb-6">
        <h2 className="text-2xl font-bold text-slate-800">Employees Salary</h2>
        <p className="text-slate-500 text-sm mt-1">Configure global percentage calculations for employee salary.</p>
      </div>

      {loading && !defaultWageSheetId ? (
        <div className="text-slate-500 py-4">Initializing configuration...</div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                HRA (%)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 5"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={hraPercentage}
                    onChange={(e) => setHraPercentage(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 font-medium">
                    %
                  </div>
                </div>
                <span className="text-sm text-slate-500">of Basic Salary</span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Bonus (%)
              </label>
              <div className="flex items-center gap-3">
                <div className="relative flex-1 max-w-xs">
                  <input 
                    type="number"
                    step="0.01"
                    required
                    placeholder="e.g. 8.33"
                    className="w-full px-4 py-2 border border-slate-300 rounded-md text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    value={bonusPercentage}
                    onChange={(e) => setBonusPercentage(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none text-slate-400 font-medium">
                    %
                  </div>
                </div>
                <span className="text-sm text-slate-500">of Basic Salary</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button 
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 transition-colors flex items-center gap-2 disabled:opacity-70"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Saving...' : 'Save Formula'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Formulas;
