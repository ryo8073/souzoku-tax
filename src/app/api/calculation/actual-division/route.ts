import { NextRequest, NextResponse } from 'next/server';
import { InheritanceTaxCalculator } from '@/lib/tax-calculator';
import { DivisionInput } from '@/types/inheritance';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const divisionInput: DivisionInput = body;

    if (!divisionInput.heirs || !divisionInput.total_amount || !divisionInput.total_tax_amount) {
      return NextResponse.json({
        success: false,
        error: 'heirs, total_amount, and total_tax_amount are required'
      }, { status: 400 });
    }

    const calculator = new InheritanceTaxCalculator();
    
    // バリデーション
    const validation = calculator.validateDivisionInput(divisionInput, divisionInput.heirs);
    if (!validation.is_valid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        validation_errors: validation.errors
      }, { status: 400 });
    }

    // 実際の分割計算
    const divisionResult = calculator.calculateActualDivision(divisionInput);

    return NextResponse.json({
      success: true,
      result: divisionResult
    });

  } catch (error) {
    console.error('Error in division calculation:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

