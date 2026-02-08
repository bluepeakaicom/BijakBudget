
export interface MySaraStatus {
  isEligible: boolean;
  balance: number;
  lastCreditDate: string;
  nextCreditDate: string;
  monthlyAllowance: number;
  status: 'Active' | 'Suspended' | 'Pending';
  recipientName?: string;
  transactions: {
      date: string;
      merchant: string;
      amount: number;
  }[];
}

// Mock API Call to check MySARA status
export const checkMySaraStatus = async (mykad: string): Promise<MySaraStatus> => {
  // Simulate network delay
  await new Promise(r => setTimeout(r, 2000));

  // Basic validation
  if (!/^\d{12}$/.test(mykad)) {
      throw new Error("Invalid MyKad format. Please enter 12 digits without dashes.");
  }

  // Mock Logic:
  // - If MyKad ends in '0' or '2' -> Eligible (Active)
  // - If MyKad ends in '1' -> Not Eligible
  // - Others -> Suspended/Pending for demo variety
  
  const lastDigit = parseInt(mykad.slice(-1));

  if (lastDigit === 1) {
      // Not Eligible
      return {
          isEligible: false,
          balance: 0,
          lastCreditDate: '-',
          nextCreditDate: '-',
          monthlyAllowance: 0,
          status: 'Active',
          transactions: []
      };
  }

  // Generate a realistic mock balance
  const mockBalance = lastDigit * 25.50 + 50; 

  return {
      isEligible: true,
      recipientName: "WARGA MALAYSIA (DEMO)",
      balance: mockBalance, 
      monthlyAllowance: 100, // Standard SARA allowance
      lastCreditDate: '2026-02-01',
      nextCreditDate: '2026-03-01',
      status: lastDigit > 7 ? 'Pending' : 'Active',
      transactions: [
          { date: '2026-02-05', merchant: '99 Speedmart', amount: 25.50 },
          { date: '2026-02-02', merchant: 'Lotus\'s Store', amount: 42.00 },
          { date: '2026-01-28', merchant: 'Mydin Hypermarket', amount: 15.00 }
      ]
  };
};
