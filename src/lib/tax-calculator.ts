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
      taxable_inheritance: taxableEstate,
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

    const division_details: DivisionResult['division_details'] = [];
    let total_final_tax_amount = 0;

    for (const person of heirs) {
        const acquired_amount = amounts[person.id] || 0;
        if (acquired_amount <= 0 && person.heir_type === HeirType.OTHER) continue;

        const distributed_tax = total_amount > 0 ? (acquired_amount / total_amount) * total_tax_amount : 0;
        let adjustment = 0;

        if (person.two_fold_addition) {
            adjustment += distributed_tax * 0.2;
        }

        if (person.heir_type === HeirType.SPOUSE) {
            const spouseLegalShareValue = (this.calculateSpouseLegalShare(heirs) * total_amount);
            const reductionLimit = Math.max(160_000_000, spouseLegalShareValue);
            const taxForSpouse = distributed_tax + (person.two_fold_addition ? distributed_tax * 0.2 : 0);
            
            let reductionAmount;
            if (acquired_amount >= reductionLimit) {
                reductionAmount = taxForSpouse;
            } else {
                const statutoryTaxProportion = total_tax_amount > 0 ? (total_tax_amount * person.inheritance_share) : 0;
                reductionAmount = Math.min(taxForSpouse, statutoryTaxProportion);
            }
            adjustment -= reductionAmount;
        }
        
        const final_tax_amount = Math.max(0, distributed_tax + adjustment);
        total_final_tax_amount += final_tax_amount;

        division_details.push({
            heir_id: person.id, name: person.name, relationship: person.relationship,
            acquired_amount: acquired_amount,
            distributed_tax: distributed_tax,
            adjustment: adjustment,
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
    let h1=1, h2=0, k1=0, k2=1;
    let b = decimal;
    do {
        const a = Math.floor(b);
        let aux = h1; h1 = a*h1+h2; h2 = aux;
        aux = k1; k1 = a*k1+k2; k2 = aux;
        b = 1/(b-a);
    } while (Math.abs(decimal-h1/k1) > decimal*tolerance);
    
    return `${h1}/${k1}`;
  }

  /**
   * 割合を金額に変換
   */
  private convertPercentageToAmount(percentages: Record<string, number>, totalAmount: number, roundingMethod: string): Record<string, number> {
    const amounts: Record<string, number> = {};
    let totalAllocated = 0;
    const heirIds = Object.keys(percentages);
    
    heirIds.forEach(id => {
      const percentage = percentages[id] / 100;
      let amount = totalAmount * percentage;
      switch(roundingMethod) {
        case 'floor': amount = Math.floor(amount); break;
        case 'ceil': amount = Math.ceil(amount); break;
        default: amount = Math.round(amount); break;
      }
      amounts[id] = amount;
      totalAllocated += amount;
    });

    const diff = totalAmount - totalAllocated;
    if (diff !== 0 && heirIds.length > 0) {
        const adjustment = diff > 0 ? 1 : -1;
        for (let i = 0; i < Math.abs(diff); i++) {
            amounts[heirIds[i % heirIds.length]] += adjustment;
        }
    }
    return amounts;
  }

  /**
   * 配偶者の法定相続分を取得
   */
  private calculateSpouseLegalShare(heirs: Heir[]): number {
    const spouse = heirs.find(h => h.heir_type === HeirType.SPOUSE);
    return spouse ? spouse.inheritance_share : 0;
  }

  /**
   * 税額速算表から税額を計算
   */
  private calculateTaxFromTable(amount: number): number {
    if (amount <= 0) return 0;
    const tier = TAX_TABLE.find(row => amount <= row.max_amount);
    if (tier) {
      return amount * tier.tax_rate - tier.deduction;
    }
    const lastTier = TAX_TABLE[TAX_TABLE.length - 1];
    return amount * lastTier.tax_rate - lastTier.deduction;
  }

  /**
   * 分割入力データのバリデーション
   */
  validateDivisionInput(divisionInput: DivisionInput, _heirs: Heir[]): ValidationResult {
    const { mode, amounts = {}, percentages = {}, total_amount } = divisionInput;
    const errors: ValidationError[] = [];

    if (mode === 'amount') {
        const totalInputAmount = Object.values(amounts).reduce((sum, val) => sum + (Number(val) || 0), 0);
        if (Math.round(totalInputAmount) !== Math.round(total_amount)) {
            errors.push({ field: 'total', code: 'total_mismatch', message: '合計額が一致しません。' });
        }
    } else { // percentage
        const totalInputPercentage = Object.values(percentages).reduce((sum, val) => sum + (Number(val) || 0), 0);
        if (Math.abs(totalInputPercentage - 100) > 0.01) {
            errors.push({ field: 'total', code: 'total_mismatch', message: '合計割合が100%になりません。' });
        }
    }
    return { is_valid: errors.length === 0, errors };
  }

  /**
   * 家族構成入力のバリデーション
   */
  validateFamilyStructure(familyStructure: FamilyStructure): ValidationResult {
    const errors: ValidationError[] = [];
    const { children_count, adopted_children_count, grandchild_adopted_count, parents_alive, siblings_count, half_siblings_count } = familyStructure;

    if (children_count < 0 || adopted_children_count < 0 || grandchild_adopted_count < 0) {
      errors.push({ field: 'children_count', code: 'negative_number', message: '人数に負の値は入力できません。'});
    }
    if (children_count < adopted_children_count) {
      errors.push({ field: 'adopted_children_count', code: 'invalid_adopted_count', message: '養子の数は子供の総数以下である必要があります。'});
    }
    if (adopted_children_count < grandchild_adopted_count) {
      errors.push({ field: 'grandchild_adopted_count', code: 'invalid_grandchild_adopted_count', message: '孫養子の数は養子の数以下である必要があります。'});
    }
    if (parents_alive < 0 || parents_alive > 2) {
      errors.push({ field: 'parents_alive', code: 'invalid_parents_count', message: '親の数は0-2の間である必要があります。'});
    }
    if (siblings_count < 0 || half_siblings_count < 0) {
      errors.push({ field: 'siblings_count', code: 'invalid_siblings_count', message: '兄弟の数は0以上である必要があります。'});
    }
    return { is_valid: errors.length === 0, errors };
  }
}

