// 相続税計算のビジネスロジック

import {
  FamilyStructure,
  Heir,
  HeirType,
  RelationshipType,
  TaxCalculationResult,
  DivisionInput,
  DivisionResult,
  ValidationError,
  ValidationResult,
  TAX_TABLE,
  BASIC_DEDUCTION_BASE,
  BASIC_DEDUCTION_PER_HEIR
} from '@/types/inheritance';

export class InheritanceTaxCalculator {
  /**
   * 法定相続人を判定する
   */
  determineLegalHeirs(familyStructure: FamilyStructure): Heir[] {
    const heirs: Heir[] = [];
    const hasChildren = familyStructure.children_count > 0;
    const hasParents = familyStructure.parents_alive > 0;
    const hasSiblings = familyStructure.siblings_count > 0 || familyStructure.half_siblings_count > 0;
    let spouseShare = 0.0;
    let othersShare = 1.0;

    if (familyStructure.spouse_exists) {
        if (hasChildren) spouseShare = 0.5;
        else if (hasParents) spouseShare = 2/3;
        else if (hasSiblings) spouseShare = 0.75;
        else spouseShare = 1.0;
        othersShare = 1.0 - spouseShare;
        heirs.push({
            id: "spouse", name: "配偶者", heir_type: HeirType.SPOUSE, relationship: RelationshipType.SPOUSE,
            inheritance_share: spouseShare, two_fold_addition: false
        });
    }

    if (hasChildren) {
        const totalChildren = familyStructure.children_count;
        const biologicalChildrenCount = totalChildren - familyStructure.adopted_children_count;
        const normalAdoptedCount = familyStructure.adopted_children_count - familyStructure.grandchild_adopted_count;
        const individualShare = totalChildren > 0 ? othersShare / totalChildren : 0;
        
        let child_count = 0;
        for (let i = 0; i < biologicalChildrenCount; i++) {
            child_count++;
            heirs.push({
                id: `child_${child_count}`, name: `子${child_count}`, heir_type: HeirType.CHILD, relationship: RelationshipType.CHILD,
                inheritance_share: individualShare, two_fold_addition: false, is_adopted: false
            });
        }
        
        let adopted_count = 0;
        for (let i = 0; i < normalAdoptedCount; i++) {
            adopted_count++;
            heirs.push({
                id: `adopted_${adopted_count}`, name: `養子${adopted_count}`, heir_type: HeirType.CHILD, relationship: RelationshipType.ADOPTED_CHILD,
                inheritance_share: individualShare, two_fold_addition: false, is_adopted: true
            });
        }

        let grandchild_adopted_count = 0;
        for (let i = 0; i < familyStructure.grandchild_adopted_count; i++) {
            grandchild_adopted_count++;
            heirs.push({
                id: `grandchild_adopted_${grandchild_adopted_count}`, name: `孫養子${grandchild_adopted_count}`,
                heir_type: HeirType.CHILD, relationship: RelationshipType.GRANDCHILD_ADOPTED,
                inheritance_share: individualShare, two_fold_addition: true, is_adopted: true
            });
        }
    } else if (hasParents) {
        const individualShare = othersShare / familyStructure.parents_alive;
        for (let i = 0; i < familyStructure.parents_alive; i++) {
            heirs.push({
                id: `parent_${i+1}`, name: `親${i+1}`, heir_type: HeirType.PARENT, relationship: RelationshipType.PARENT,
                inheritance_share: individualShare, two_fold_addition: false
            });
        }
    } else if (hasSiblings) {
        const totalUnits = familyStructure.siblings_count + familyStructure.half_siblings_count * 0.5;
        const fullSiblingShare = totalUnits > 0 ? othersShare / totalUnits : 0;
        for (let i = 0; i < familyStructure.siblings_count; i++) {
            heirs.push({
                id: `sibling_${i+1}`, name: `兄弟姉妹${i+1}`, heir_type: HeirType.SIBLING, relationship: RelationshipType.SIBLING,
                inheritance_share: fullSiblingShare, two_fold_addition: true
            });
        }
        for (let i = 0; i < familyStructure.half_siblings_count; i++) {
            heirs.push({
                id: `half_sibling_${i+1}`, name: `半血兄弟姉妹${i+1}`, heir_type: HeirType.SIBLING, relationship: RelationshipType.HALF_SIBLING,
                inheritance_share: fullSiblingShare * 0.5, two_fold_addition: true
            });
        }
    }

    for (let i = 0; i < familyStructure.non_heirs_count; i++) {
        heirs.push({
            id: `non_heir_${i+1}`, name: `法定相続人以外${i+1}`, heir_type: HeirType.OTHER, relationship: RelationshipType.OTHER,
            inheritance_share: 0, two_fold_addition: true
        });
    }
    return heirs;
  }

  /**
   * 基礎控除額を計算する
   */
  calculateBasicDeduction(heirs: Heir[]): number {
    const legalHeirsCount = this.countLegalHeirsForDeduction(heirs);
    return BASIC_DEDUCTION_BASE + (BASIC_DEDUCTION_PER_HEIR * legalHeirsCount);
  }

  /**
   * 基礎控除計算用の法定相続人数を計算（養子の制限を適用）
   */
  private countLegalHeirsForDeduction(heirs: Heir[]): number {
    const legalHeirs = heirs.filter(h => h.heir_type !== HeirType.OTHER);
    let biologicalChildrenCount = 0;
    let adoptedChildrenCount = 0;
    legalHeirs.forEach(h => {
        if (h.heir_type === HeirType.CHILD && !h.is_adopted) biologicalChildrenCount++;
        if (h.heir_type === HeirType.CHILD && h.is_adopted) adoptedChildrenCount++;
    });

    const adoptedLimit = biologicalChildrenCount > 0 ? 1 : 2;
    const countedAdopted = Math.min(adoptedChildrenCount, adoptedLimit);
    
    return legalHeirs.filter(h => h.heir_type !== HeirType.CHILD).length + biologicalChildrenCount + countedAdopted;
  }

  /**
   * 法定相続分による相続税計算
   */
  calculateTaxByLegalShare(taxableAmount: number, heirs: Heir[]): TaxCalculationResult {
    const basicDeduction = this.calculateBasicDeduction(heirs);
    const taxableEstate = Math.max(0, taxableAmount - basicDeduction);
    const heir_tax_details: TaxCalculationResult['heir_tax_details'] = [];
    let total_tax_amount = 0;

    if (taxableEstate > 0) {
      const tempDetails: { tax: number }[] = [];
      let tempTotalTax = 0;
      for (const heir of heirs.filter(h => h.heir_type !== HeirType.OTHER)) {
        const heirTaxableAmount = taxableEstate * heir.inheritance_share;
        const tax = this.calculateTaxFromTable(heirTaxableAmount);
        tempDetails.push({ tax });
        tempTotalTax += tax;
      }
      total_tax_amount = tempTotalTax;
      
      heirs.filter(h => h.heir_type !== HeirType.OTHER).forEach((heir, index) => {
        heir_tax_details.push({
          heir_id: heir.id, name: heir.name, relationship: heir.relationship,
          legal_share_amount: taxableAmount * heir.inheritance_share,
          tax_before_addition: tempDetails[index].tax,
          two_fold_addition: heir.two_fold_addition,
          legal_share_fraction: this.toFraction(heir.inheritance_share),
        });
      });
    } else {
        heirs.filter(h => h.heir_type !== HeirType.OTHER).forEach(heir => {
            heir_tax_details.push({
                heir_id: heir.id, name: heir.name, relationship: heir.relationship,
                legal_share_amount: taxableAmount * heir.inheritance_share,
                tax_before_addition: 0,
                two_fold_addition: heir.two_fold_addition,
                legal_share_fraction: this.toFraction(heir.inheritance_share),
            });
        });
    }

    return {
      legal_heirs: heirs,
      total_heirs_count: this.countLegalHeirsForDeduction(heirs),
      basic_deduction: basicDeduction,
      taxable_estate: taxableEstate,
      total_tax_amount: Math.round(total_tax_amount),
      heir_tax_details
    };
  }

  /**
   * 実際の分割による相続税計算
   */
  calculateActualDivision(divisionInput: DivisionInput): DivisionResult {
    const { total_amount, total_tax_amount, heirs } = divisionInput;
    let amounts = divisionInput.amounts || {};
    if (divisionInput.mode === 'percentage' && divisionInput.percentages) {
        amounts = this.convertPercentageToAmount(divisionInput.percentages, total_amount, divisionInput.rounding_method || 'round');
    }

    const totalActualAmount = Object.values(amounts).reduce((sum, amount) => sum + amount, 0);
    const safeTotal = totalActualAmount === 0 ? 1 : totalActualAmount;

    const division_details: DivisionResult['division_details'] = [];
    let total_final_tax_amount = 0;

    for (const person of heirs) {
        const acquired_amount = amounts[person.id] || 0;
        if (acquired_amount <= 0 && person.heir_type === HeirType.OTHER) continue;

        const actualShare = acquired_amount / safeTotal;
        const proportionalTax = Math.floor(total_tax_amount * actualShare);
        
        let adjustmentAmount = 0;

        if (person.two_fold_addition) {
            const surcharge = Math.floor(proportionalTax * 0.2);
            adjustmentAmount += surcharge;
        }

        if (person.heir_type === HeirType.SPOUSE) {
          const spouseStatutoryShare = this.calculateSpouseLegalShare(heirs);
          const reductionAssetLimit = Math.max(160_000_000, total_amount * spouseStatutoryShare);
          const reductionBaseAmount = Math.min(acquired_amount, reductionAssetLimit);
          
          const baseForReductionCalc = total_amount > 0 ? total_amount : 1;
          const maxReduction = Math.floor(total_tax_amount * (reductionBaseAmount / baseForReductionCalc));
          
          const deduction = Math.min(proportionalTax, maxReduction);
          adjustmentAmount -= deduction;
        }
        
        const final_tax_amount = Math.max(0, proportionalTax + adjustmentAmount);
        total_final_tax_amount += final_tax_amount;

        division_details.push({
            heir_id: person.id, name: person.name, relationship: person.relationship,
            acquired_amount: acquired_amount,
            distributed_tax: proportionalTax,
            adjustment: adjustmentAmount,
            final_tax_amount: final_tax_amount
        });
    }
    
    return {
      total_final_tax_amount: Math.round(total_final_tax_amount),
      division_details: division_details.map(d => ({
        ...d,
        acquired_amount: Math.round(d.acquired_amount),
        distributed_tax: Math.round(d.distributed_tax),
        adjustment: Math.round(d.adjustment),
        final_tax_amount: Math.round(d.final_tax_amount)
      }))
    };
  }

  /**
   * 割合を分数に変換
   */
  private toFraction(decimal: number, tolerance = 1.0E-6): string {
    if (decimal === 0) return "0";
    if (decimal === 1) return "1";
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = decimal;
    do {
      const a = Math.floor(b);
      let aux = h1; h1 = a * h1 + h2; h2 = aux;
      aux = k1; k1 = a * k1 + k2; k2 = aux;
      b = 1 / (b - a);
    } while (Math.abs(decimal - h1 / k1) > decimal * tolerance);
    return `${h1}/${k1}`;
  }

  private convertPercentageToAmount(
    percentages: Record<string, number>,
    totalAmount: number,
    roundingMethod: 'round' | 'floor' | 'ceil'
  ): Record<string, number> {
    const amounts: Record<string, number> = {};
    let totalCalculatedAmount = 0;
    const keys = Object.keys(percentages);
  
    keys.forEach(key => {
      const percentage = percentages[key] / 100;
      let amount = totalAmount * percentage;
      if (roundingMethod === 'floor') {
        amount = Math.floor(amount);
      } else if (roundingMethod === 'ceil') {
        amount = Math.ceil(amount);
      } else {
        amount = Math.round(amount);
      }
      amounts[key] = amount;
      totalCalculatedAmount += amount;
    });
  
    // Adjust for rounding errors
    let difference = totalAmount - totalCalculatedAmount;
    if (difference !== 0) {
      // Distribute the difference among the heirs, starting from the largest share
      const sortedKeys = keys.sort((a, b) => percentages[b] - percentages[a]);
      let i = 0;
      while (difference !== 0) {
        const key = sortedKeys[i % sortedKeys.length];
        const adjustment = difference > 0 ? 1 : -1;
        amounts[key] += adjustment;
        difference -= adjustment;
        i++;
      }
    }
    return amounts;
  }  

  private calculateSpouseLegalShare(heirs: Heir[]): number {
    const spouse = heirs.find(h => h.heir_type === HeirType.SPOUSE);
    return spouse ? spouse.inheritance_share : 0;
  }

  private calculateTaxFromTable(amount: number): number {
    if (amount <= 0) return 0;
    const row = TAX_TABLE.find(r => amount <= r.max_amount);
    if (row) {
      return amount * row.tax_rate - row.deduction;
    }
    // Fallback for amounts larger than the max in the table (shouldn't happen with Infinity)
    const lastRow = TAX_TABLE[TAX_TABLE.length - 1];
    return amount * lastRow.tax_rate - lastRow.deduction;
  }

  validateDivisionInput(divisionInput: DivisionInput, _heirs: Heir[]): ValidationResult {
    const errors: ValidationError[] = [];
    const { mode, amounts, percentages, total_amount } = divisionInput;

    if (mode === 'amount') {
        if (!amounts || Object.keys(amounts).length === 0) {
            errors.push({ field: 'amounts', code: 'missing', message: '金額が指定されていません。' });
        } else {
            const totalInputAmount = Object.values(amounts).reduce((sum, val) => sum + val, 0);
            if (Math.round(totalInputAmount) !== total_amount) {
                errors.push({ field: 'total_amount', code: 'mismatch', message: '合計額が課税価格と一致しません。' });
            }
        }
    } else if (mode === 'percentage') {
        if (!percentages || Object.keys(percentages).length === 0) {
            errors.push({ field: 'percentages', code: 'missing', message: '割合が指定されていません。' });
        } else {
            const totalInputPercentage = Object.values(percentages).reduce((sum, val) => sum + val, 0);
            if (Math.abs(totalInputPercentage - 100) > 0.01) {
                errors.push({ field: 'total_percentage', code: 'mismatch', message: '合計割合が100%になりません。' });
            }
        }
    }

    return { is_valid: errors.length === 0, errors };
  }

  validateFamilyStructure(familyStructure: FamilyStructure): ValidationResult {
    const errors: ValidationError[] = [];
    const { children_count, adopted_children_count } = familyStructure;

    if (adopted_children_count > children_count) {
        errors.push({
            field: 'adopted_children_count',
            code: 'invalid_count',
            message: '養子の数は子の数を超えることはできません。'
        });
    }

    return { is_valid: errors.length === 0, errors };
  }
}