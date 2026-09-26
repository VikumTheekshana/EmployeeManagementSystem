export interface AllowanceRule {
  name: string;
  type: 'fixed' | 'percentage' | 'conditional';
  amount?: number;
  rate?: number; // e.g. 0.10 for 10% of basic
  condition?: string;
  isEPFQualifying?: boolean;
}

export interface DeductionRule {
  name: string;
  type: 'fixed' | 'percentage';
  amount?: number;
  rate?: number;
}

export interface PayrollCalculationInput {
  basicSalary: number;
  customAllowances?: Array<{ name: string; amount: number; isEPFQualifying?: boolean }>;
  customDeductions?: Array<{ name: string; amount: number }>;
  unpaidLeaveDays?: number;
  daysInMonth?: number;
}

export interface PayrollCalculationOutput {
  basicSalary: number;
  allowances: Array<{ name: string; amount: number }>;
  grossEarnings: number;
  epfQualifyingSalary: number;
  epfEmployee: number; // 8%
  epfEmployer: number; // 12%
  etfEmployer: number; // 3%
  apitTax: number;
  otherDeductions: Array<{ name: string; amount: number }>;
  totalDeductions: number;
  netSalary: number;
  costToCompany: number;
}

export class PayrollCalculator {
  /**
   * Calculates Sri Lanka Inland Revenue APIT (Advance Personal Income Tax) monthly progressive slabs
   */
  public static calculateAPIT(monthlyGrossTaxableEarnings: number): number {
    if (monthlyGrossTaxableEarnings <= 100000) {
      return 0; // Tax-free relief up to 100,000 LKR / month
    }

    let taxableIncome = monthlyGrossTaxableEarnings - 100000;
    let tax = 0;
    const slabSize = 41666.67;
    const rates = [0.06, 0.12, 0.18, 0.24, 0.30];

    for (const rate of rates) {
      if (taxableIncome <= 0) break;
      const amountInSlab = Math.min(taxableIncome, slabSize);
      tax += amountInSlab * rate;
      taxableIncome -= amountInSlab;
    }

    // Top tier: remainder over 308,333 at 36%
    if (taxableIncome > 0) {
      tax += taxableIncome * 0.36;
    }

    return Math.round(tax * 100) / 100;
  }

  /**
   * Evaluates dynamic JSON formula rules for allowances
   */
  public static evaluateDynamicAllowances(
    basicSalary: number,
    rules: AllowanceRule[] = []
  ): Array<{ name: string; amount: number; isEPFQualifying: boolean }> {
    const defaultRules: AllowanceRule[] = [
      { name: 'Cost of Living Allowance (COLA)', type: 'fixed', amount: 17800, isEPFQualifying: true },
      { name: 'Travelling Allowance', type: 'percentage', rate: 0.08, isEPFQualifying: false },
      { name: 'Communication & Utility Allowance', type: 'fixed', amount: 7500, isEPFQualifying: false },
    ];

    const activeRules = rules.length > 0 ? rules : defaultRules;
    const evaluated: Array<{ name: string; amount: number; isEPFQualifying: boolean }> = [];

    for (const rule of activeRules) {
      let amount = 0;
      if (rule.type === 'fixed') {
        amount = rule.amount || 0;
      } else if (rule.type === 'percentage') {
        amount = Math.round(basicSalary * (rule.rate || 0) * 100) / 100;
      } else if (rule.type === 'conditional') {
        if (rule.condition && basicSalary >= 250000) {
          amount = rule.amount || 0;
        }
      }

      if (amount > 0) {
        evaluated.push({
          name: rule.name,
          amount,
          isEPFQualifying: !!rule.isEPFQualifying,
        });
      }
    }

    return evaluated;
  }

  /**
   * Executes end-to-end statutory payroll computation
   */
  public static compute(input: PayrollCalculationInput): PayrollCalculationOutput {
    const basicSalary = Number(input.basicSalary) || 0;

    // Evaluate Allowances
    const computedAllowances = input.customAllowances || this.evaluateDynamicAllowances(basicSalary);
    const totalAllowances = computedAllowances.reduce((acc, curr) => acc + curr.amount, 0);

    // Unpaid leave deduction
    let unpaidLeaveDeduction = 0;
    if (input.unpaidLeaveDays && input.unpaidLeaveDays > 0) {
      const days = input.daysInMonth || 30;
      unpaidLeaveDeduction = Math.round((basicSalary / days) * input.unpaidLeaveDays * 100) / 100;
    }

    // Gross Earnings
    const grossEarnings = Math.max(0, basicSalary + totalAllowances - unpaidLeaveDeduction);

    // Sri Lankan EPF Qualifying Earnings = Basic + qualifying allowances
    const qualifyingAllowances = computedAllowances
      .filter((a) => a.isEPFQualifying)
      .reduce((acc, curr) => acc + curr.amount, 0);
    const epfQualifyingSalary = Math.max(0, basicSalary + qualifyingAllowances - unpaidLeaveDeduction);

    // Statutory Calculations
    const epfEmployee = Math.round(epfQualifyingSalary * 0.08 * 100) / 100; // 8%
    const epfEmployer = Math.round(epfQualifyingSalary * 0.12 * 100) / 100; // 12%
    const etfEmployer = Math.round(epfQualifyingSalary * 0.03 * 100) / 100; // 3%

    // APIT Income Tax
    const apitTax = this.calculateAPIT(grossEarnings);

    // Other Deductions
    const otherDeductions = [...(input.customDeductions || [])];
    if (unpaidLeaveDeduction > 0) {
      otherDeductions.push({
        name: `No-Pay Leave Deduction (${input.unpaidLeaveDays} days)`,
        amount: unpaidLeaveDeduction,
      });
    }

    const totalOtherDeductions = otherDeductions.reduce((acc, curr) => acc + curr.amount, 0);
    const totalDeductions = Math.round((epfEmployee + apitTax + totalOtherDeductions) * 100) / 100;
    const netSalary = Math.round(Math.max(0, grossEarnings - totalDeductions) * 100) / 100;
    const costToCompany = Math.round((grossEarnings + epfEmployer + etfEmployer) * 100) / 100;

    return {
      basicSalary,
      allowances: computedAllowances.map((a) => ({ name: a.name, amount: a.amount })),
      grossEarnings,
      epfQualifyingSalary,
      epfEmployee,
      epfEmployer,
      etfEmployer,
      apitTax,
      otherDeductions,
      totalDeductions,
      netSalary,
      costToCompany,
    };
  }
}
