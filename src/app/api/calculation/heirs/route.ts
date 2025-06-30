import { NextRequest, NextResponse } from 'next/server';
import { InheritanceTaxCalculator } from '@/lib/tax-calculator';
import { FamilyStructure } from '@/types/inheritance';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { family_structure }: { family_structure: FamilyStructure } = body;

    if (!family_structure) {
      return NextResponse.json({
        success: false,
        error: 'family_structure is required'
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

    return NextResponse.json({
      success: true,
      result: {
        legal_heirs: legalHeirs
      }
    });

  } catch (error) {
    console.error('Error in heirs calculation:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

