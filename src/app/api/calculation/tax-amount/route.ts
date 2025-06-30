import { NextResponse } from 'next/server';
import { InheritanceTaxCalculator } from '@/lib/tax-calculator';
import { FamilyStructure, TaxCalculationResult } from '@/types/inheritance';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { taxableAmount, familyStructure }: { taxableAmount: number; familyStructure: FamilyStructure } = body;

    // Basic validation
    if (typeof taxableAmount !== 'number' || !familyStructure) {
      return NextResponse.json({ message: 'Invalid input. `taxableAmount` (number) and `familyStructure` (object) are required.' }, { status: 400 });
    }

    const calculator = new InheritanceTaxCalculator();
    
    // Validate family structure logic
    const validationResult = calculator.validateFamilyStructure(familyStructure);
    if (!validationResult.is_valid) {
      return NextResponse.json({ message: 'Invalid family structure.', errors: validationResult.errors }, { status: 400 });
    }

    const legalHeirs = calculator.determineLegalHeirs(familyStructure);
    const result: TaxCalculationResult = calculator.calculateTaxByLegalShare(taxableAmount, legalHeirs);
    
    return NextResponse.json(result);

  } catch (error) {
    let errorMessage = 'An unknown error occurred';
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    console.error('Error in /api/calculation/tax-amount:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: errorMessage }, { status: 500 });
  }
}