// src/utils/formulaConfig.js
/**
 * Master Data Formula & Percentage Configuration System
 * Provides centralized dynamic formulas for Wage Sheet, Statutory Compliances,
 * Employees Master, and Attendance modules with persistence and fallback defaults.
 */

export const FORMULA_MODULES = {
  wage_sheet: {
    id: "wage_sheet",
    name: "Wage Sheet & Payroll",
    tag: "Finance & Payroll",
    color: "teal",
    description: "Monthly wage calculations, allowances, statutory contributions, and contractor billing markups.",
    formulas: [
      {
        key: "hra_pct",
        name: "HRA Percentage",
        unit: "%",
        defaultValue: 5.0,
        baseField: "Basic Salary",
        formulaDesc: "Basic Salary × (HRA % / 100)",
        description: "House Rent Allowance calculated dynamically from monthly basic salary rate.",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "bonus_pct",
        name: "Statutory Bonus",
        unit: "%",
        defaultValue: 8.33,
        baseField: "Basic Salary",
        formulaDesc: "Basic Salary × (Bonus % / 100)",
        description: "Standard statutory annual/monthly bonus rate computed on basic salary.",
        min: 0,
        max: 100,
        step: 0.01,
      },
      {
        key: "leave_encashment_pct",
        name: "Leave Encashment",
        unit: "%",
        defaultValue: 5.0,
        baseField: "Basic Salary",
        formulaDesc: "Basic Salary × (Leave Encashment % / 100)",
        description: "Monthly earned leave encashment provision rate.",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "pf_employer_pct",
        name: "Employer PF Contribution",
        unit: "%",
        defaultValue: 13.0,
        baseField: "Basic Rate (Capped at 15,000)",
        formulaDesc: "MIN(Basic, 15000) × (PF Employer % / 100)",
        description: "Employer statutory contribution for EPF, EPS, and administrative EDLI.",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "pf_employee_pct",
        name: "Employee PF Deduction",
        unit: "%",
        defaultValue: 12.0,
        baseField: "Basic Earned (Capped at ₹1,800)",
        formulaDesc: "MIN((Basic Earned × PF % / 100), 1800)",
        description: "Statutory provident fund deduction withheld from employee salary.",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "esic_employer_pct",
        name: "Employer ESIC Contribution",
        unit: "%",
        defaultValue: 3.25,
        baseField: "Gross Salary - Bonus",
        formulaDesc: "(Gross Salary - Bonus) × (ESIC % / 100)",
        description: "Employer medical insurance contribution towards ESIC scheme.",
        min: 0,
        max: 100,
        step: 0.05,
      },
      {
        key: "esic_employee_pct",
        name: "Employee ESIC Deduction",
        unit: "%",
        defaultValue: 0.75,
        baseField: "Gross - Transport - Bonus - Leave",
        formulaDesc: "ROUNDUP(ESIC Base × (ESIC % / 100), 0)",
        description: "Employee share of ESIC health insurance deducted from earnings.",
        min: 0,
        max: 100,
        step: 0.05,
      },
      {
        key: "service_charge_pct",
        name: "Contractor Service Charges",
        unit: "%",
        defaultValue: 7.0,
        baseField: "Gross + PF13 + ESIC + Uniform",
        formulaDesc: "(Gross + PF13 + ESIC + Uniform) × (Service % / 100)",
        description: "Billing administration and management service markup percentage.",
        min: 0,
        max: 100,
        step: 0.5,
      },
      {
        key: "canteen_deduction_day",
        name: "Canteen Daily Deduction",
        unit: "₹/day",
        defaultValue: 15.0,
        baseField: "(Work Days + C-Off)",
        formulaDesc: "(Work Days + C-Off) × ₹ Daily Rate",
        description: "Standard daily meal and canteen facility deduction.",
        min: 0,
        max: 500,
        step: 1,
      },
    ],
  },
  compliances: {
    id: "compliances",
    name: "Statutory Compliances",
    tag: "Statutory & Government",
    color: "purple",
    description: "PF ECR electronic returns, ESIC portal monthly filings, and statutory split percentages.",
    formulas: [
      {
        key: "ee_pf_pct",
        name: "Employee PF Contribution (EE PF)",
        unit: "%",
        defaultValue: 12.0,
        baseField: "EPF Wages",
        formulaDesc: "MIN(EPF Wages × 12%, 1800)",
        description: "Employee PF statutory percentage filed under Account 01 in ECR.",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "er_eps_pct",
        name: "Employer Pension Scheme (EPS)",
        unit: "%",
        defaultValue: 8.33,
        baseField: "EPS Wages",
        formulaDesc: "MIN(EPS Wages × 8.33%, 1250)",
        description: "Employer contribution towards employee pension fund filed in Account 10.",
        min: 0,
        max: 100,
        step: 0.01,
      },
      {
        key: "er_epf_pct",
        name: "Employer EPF Differential",
        unit: "%",
        defaultValue: 3.67,
        baseField: "EPF Wages",
        formulaDesc: "EE PF (12%) - ER EPS (8.33%) = 3.67%",
        description: "Remaining employer provident fund portion remitted to Account 01.",
        min: 0,
        max: 100,
        step: 0.01,
      },
      {
        key: "er_admin_pct",
        name: "PF Admin & EDLI Charges",
        unit: "%",
        defaultValue: 1.0,
        baseField: "EPF Wages",
        formulaDesc: "EPF Wages × (Admin % / 100)",
        description: "Administrative overhead charges and deposit-linked insurance contribution.",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "ee_esic_pct",
        name: "Employee ESIC Deduction",
        unit: "%",
        defaultValue: 0.75,
        baseField: "ESIC Wages",
        formulaDesc: "CEIL(ESIC Wages × 0.75%)",
        description: "Employee health contribution submitted on ESIC portal.",
        min: 0,
        max: 100,
        step: 0.05,
      },
      {
        key: "er_esic_pct",
        name: "Employer ESIC Contribution",
        unit: "%",
        defaultValue: 3.25,
        baseField: "ESIC Wages",
        formulaDesc: "ROUND(ESIC Wages × 3.25%, 0)",
        description: "Employer health insurance share submitted on ESIC portal.",
        min: 0,
        max: 100,
        step: 0.05,
      },
      {
        key: "lwf_fixed",
        name: "Labour Welfare Fund (LWF)",
        unit: "₹",
        defaultValue: 25.0,
        baseField: "Fixed Monthly Deduction",
        formulaDesc: "Fixed ₹ Deduction per eligible employee",
        description: "Standard statutory Labour Welfare Fund contribution.",
        min: 0,
        max: 200,
        step: 1,
      },
    ],
  },
  employees: {
    id: "employees",
    name: "Employees Salary Structure",
    tag: "Workforce Masters",
    color: "emerald",
    description: "Standard default rates applied when creating or importing new employee salary profiles.",
    formulas: [
      {
        key: "default_hra_pct",
        name: "Standard HRA Rate",
        unit: "%",
        defaultValue: 5.0,
        baseField: "Basic Salary",
        formulaDesc: "Basic Salary × 5%",
        description: "Default HRA percentage automatically computed during employee registration.",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "default_bonus_pct",
        name: "Standard Bonus Rate",
        unit: "%",
        defaultValue: 8.33,
        baseField: "Basic Salary",
        formulaDesc: "Basic Salary × 8.33%",
        description: "Default bonus rate automatically prefilled in employee salary breakdown.",
        min: 0,
        max: 100,
        step: 0.01,
      },
      {
        key: "default_leave_pct",
        name: "Standard Leave Encashment",
        unit: "%",
        defaultValue: 5.0,
        baseField: "Basic Salary",
        formulaDesc: "Basic Salary × 5%",
        description: "Default leave encashment provision assigned to employees.",
        min: 0,
        max: 100,
        step: 0.1,
      },
      {
        key: "default_calc_days",
        name: "Monthly Calculation Days",
        unit: "Days",
        defaultValue: 27,
        baseField: "Calendar / Standard Days",
        formulaDesc: "Base division days = 27",
        description: "Standard divisor used to calculate daily wage rates from monthly gross.",
        min: 20,
        max: 31,
        step: 1,
      },
    ],
  },
  attendance: {
    id: "attendance",
    name: "Attendance & Muster",
    tag: "Site Operations",
    color: "amber",
    description: "Overtime cutoffs, extra work day thresholds, and auto-computed overtime factors.",
    formulas: [
      {
        key: "standard_days_threshold",
        name: "Standard Duty Days Threshold",
        unit: "Days",
        defaultValue: 27,
        baseField: "Total Mandays",
        formulaDesc: "Mandays > Threshold ? Mandays - Threshold : 0",
        description: "Mandays worked exceeding this number are converted into Extra Days.",
        min: 1,
        max: 31,
        step: 1,
      },
      {
        key: "extra_day_ot_factor",
        name: "Extra Day OT Factor",
        unit: "Hours/Day",
        defaultValue: 8,
        baseField: "Extra Days",
        formulaDesc: "Extra Days × Extra Day OT Factor",
        description: "Number of overtime hours credited for each extra duty day completed.",
        min: 1,
        max: 24,
        step: 1,
      },
    ],
  },
};

const STORAGE_KEY = "balaji_module_formulas_v1";

/**
 * Retrieve all stored formulas or default fallback values.
 */
export function getAllFormulas() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return getDefaultFormulas();
    }
    const parsed = JSON.parse(raw);
    const defaults = getDefaultFormulas();
    
    // Merge stored values with defaults to guarantee all keys exist
    const merged = {};
    for (const [moduleId, modConfig] of Object.entries(defaults)) {
      merged[moduleId] = {
        ...modConfig,
        ...(parsed[moduleId] || {}),
      };
    }
    return merged;
  } catch (err) {
    console.warn("Failed to read formula config from localStorage, using defaults", err);
    return getDefaultFormulas();
  }
}

/**
 * Generate default key-value formula map from definitions.
 */
export function getDefaultFormulas() {
  const result = {};
  for (const [modKey, modObj] of Object.entries(FORMULA_MODULES)) {
    result[modKey] = {};
    for (const formula of modObj.formulas) {
      result[modKey][formula.key] = formula.defaultValue;
    }
  }
  return result;
}

/**
 * Get values for a specific module.
 */
export function getModuleFormulas(moduleId) {
  const all = getAllFormulas();
  return all[moduleId] || getDefaultFormulas()[moduleId] || {};
}

/**
 * Save formula values for a specific module.
 */
export function saveModuleFormulas(moduleId, updatedValues) {
  const current = getAllFormulas();
  current[moduleId] = {
    ...current[moduleId],
    ...updatedValues,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent("formula-config-changed", { detail: { moduleId, updatedValues } }));
  return current[moduleId];
}

/**
 * Reset a single module's formulas to factory defaults.
 */
export function resetModuleFormulas(moduleId) {
  const defaults = getDefaultFormulas();
  const current = getAllFormulas();
  current[moduleId] = defaults[moduleId];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
  window.dispatchEvent(new CustomEvent("formula-config-changed", { detail: { moduleId } }));
  return current[moduleId];
}
