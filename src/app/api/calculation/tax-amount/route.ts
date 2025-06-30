import { NextRequest, NextResponse } from 'next/server';
import { InheritanceTaxCalculator } from '@/lib/tax-calculator';
import { FamilyStructure } from '@/types/inheritance';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      taxable_amount, 
      family_structure 
    }: { 
      taxable_amount: number;
      family_structure: FamilyStructure;
    } = body;

    if (!taxable_amount || !family_structure) {
      return NextResponse.json({
        success: false,
        error: 'taxable_amount and family_structure are required'
      }, { status: 400 });
    }

    const calculator = new InheritanceTaxCalculator();
    
    // バリデーション
    const validation = calculator.validateFamilyStructure(family_structure);
    if (!validation.is_valid) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        validation_errors: validation.errors
      }, { status: 400 });
    }

    // 法定相続人判定
    const legalHeirs = calculator.determineLegalHeirs(family_structure);

    // 相続税計算
    const taxResult = calculator.calculateTaxByLegalShare(taxable_amount, legalHeirs);

    return NextResponse.json({
      success: true,
      result: {
        ...taxResult,
        heirs: legalHeirs.map(h => ({
          id: h.id,
          name: h.name,
          relationship: h.relationship,
          two_fold_addition: h.two_fold_addition,
        })),
      }
    });

  } catch (error) {
    console.error('Error in tax calculation:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

