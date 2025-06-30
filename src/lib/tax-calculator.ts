// 相続税計算のビジネスロジック

import {
  FamilyStructure,
  Heir,
  HeirType,
  RelationshipType,
  HeirTaxDetail,
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
      if (hasChildren) {
        spouseShare = 1/2;
      } else if (hasParents) {
        spouseShare = 2/3;
      } else if (hasSiblings) {
        spouseShare = 3/4;
      } else {
        spouseShare = 1.0;
      }
      
      othersShare = 1.0 - spouseShare;
      
      heirs.push({
        id: "spouse",
        name: "配偶者",
        heir_type: HeirType.SPOUSE,
        relationship: RelationshipType.SPOUSE,
        inheritance_share: spouseShare,
        two_fold_addition: false
      });
    }

    // 第1順位: 子供（直系卑属）
    if (hasChildren) {
      const totalChildren = familyStructure.children_count;
      const individualShare = totalChildren > 0 ? othersShare / totalChildren : 0;
      
      for (let i = 0; i < totalChildren; i++) {
        const isAdopted = i < familyStructure.adopted_children_count;
        const isGrandchildAdopted = isAdopted && (i < familyStructure.grandchild_adopted_count);
        
        let name: string;
        let relationship: RelationshipType;
        
        if (isGrandchildAdopted) {
          name = `孫養子${i + 1}`;
          relationship = RelationshipType.GRANDCHILD_ADOPTED;
        } else if (isAdopted) {
          name = `養子${i + 1}`;
          relationship = RelationshipType.ADOPTED_CHILD;
        } else {
          name = `子供${i + 1}`;
          relationship = RelationshipType.CHILD;
        }

        heirs.push({
          id: `child_${i+1}`,
          name,
          heir_type: HeirType.CHILD,
          relationship,
          inheritance_share: individualShare,
          two_fold_addition: isGrandchildAdopted,
          is_adopted: isAdopted
        });
      }
    }
    // 第2順位: 直系尊属（子供がいない場合）
    else if (hasParents) {
      const individualShare = othersShare / familyStructure.parents_alive;
      
      for (let i = 0; i < familyStructure.parents_alive; i++) {
        heirs.push({
          id: `parent_${i+1}`,
          name: `親${i+1}`,
          heir_type: HeirType.PARENT,
          relationship: RelationshipType.PARENT,
          inheritance_share: individualShare,
          two_fold_addition: false // 親は２割加算の対象外
        });
      }
    }
    // 第3順位: 兄弟姉妹（子供も直系尊属もいない場合）
    else if (hasSiblings) {
      const totalUnits = familyStructure.siblings_count + familyStructure.half_siblings_count / 2;
      const fullSiblingShare = totalUnits > 0 ? othersShare / totalUnits : 0;
      const halfSiblingShare = fullSiblingShare / 2;
      
      for (let i = 0; i < familyStructure.siblings_count; i++) {
        heirs.push({
          id: `sibling_${i+1}`,
          name: `兄弟姉妹${i+1}`,
          heir_type: HeirType.SIBLING,
          relationship: RelationshipType.SIBLING,
          inheritance_share: fullSiblingShare,
          two_fold_addition: true
        });
      }
      
      for (let i = 0; i < familyStructure.half_siblings_count; i++) {
        heirs.push({
          id: `half_sibling_${i+1}`,
          name: `半血兄弟姉妹${i+1}`,
          heir_type: HeirType.SIBLING,
          relationship: RelationshipType.HALF_SIBLING,
          inheritance_share: halfSiblingShare,
          two_fold_addition: true
        });
      }
    }

    // 法定相続人以外の人を追加（実際の分割計算で使用するため）
    for (let i = 0; i < familyStructure.non_heirs_count; i++) {
      heirs.push({
        id: `non_heir_${i+1}`,
        name: `法定相続人以外${i+1}`,
        heir_type: HeirType.OTHER,
        relationship: RelationshipType.OTHER,
        inheritance_share: 0.0,
        two_fold_addition: true
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
    let count = 0;
    let adoptedCount = 0;
    let hasBiologicalChildren = false;
    
    for (const heir of heirs) {
      if (heir.heir_type === HeirType.SPOUSE) {
        count += 1;
      } else if (heir.heir_type === HeirType.CHILD) {
        if (heir.is_adopted) {
          adoptedCount += 1;
        } else {
          count += 1;
          hasBiologicalChildren = true;
        }
      } else if ([HeirType.PARENT, HeirType.SIBLING].includes(heir.heir_type)) {
        count += 1;
      }
    }
    
    // 養子の制限を適用
    if (hasBiologicalChildren) {
      // 実子がいる場合、養子は1人まで
      count += Math.min(adoptedCount, 1);
    } else {
      // 実子がいない場合、養子は2人まで
      count += Math.min(adoptedCount, 2);
    }
    
    return count;
  }

  /**
   * 法定相続分による相続税計算
   */
  calculateTaxByLegalShare(taxableAmount: number, heirs: Heir[]): TaxCalculationResult {
    // 基礎控除額の計算
    const basicDeduction = this.calculateBasicDeduction(heirs);
    
    // 課税遺産総額の計算
    const taxableEstate = Math.max(0, taxableAmount - basicDeduction);
    
    if (taxableEstate === 0) {
      // 相続税がかからない場合
      const heirDetails: HeirTaxDetail[] = [];
      for (const heir of heirs) {
        heirDetails.push({
          heir_id: heir.id,
          name: heir.name,
          relationship: heir.relationship,
          legal_share_amount: Math.floor(taxableAmount * heir.inheritance_share),
          tax_before_addition: 0,
          two_fold_addition: 0,
          tax_after_addition: 0
        });
      }
      
      return {
        legal_heirs: heirs,
        total_heirs_count: heirs.length,
        basic_deduction: basicDeduction,
        taxable_inheritance: taxableEstate,
        total_tax_amount: 0,
        heir_tax_details: heirDetails
      };
    }
    
    // 各相続人の相続税額を計算
    const heirDetails: HeirTaxDetail[] = [];
    let totalTax = 0;
    
    for (const heir of heirs) {
      // 法定相続分に応じた課税遺産額
      const heirTaxableAmount = Math.floor(taxableEstate * heir.inheritance_share);
      
      // 相続税額の計算（2割加算前）
      const taxBeforeAddition = this.calculateTaxFromTable(heirTaxableAmount);
      totalTax += taxBeforeAddition;
      
      heirDetails.push({
        heir_id: heir.id,
        name: heir.name,
        relationship: heir.relationship,
        legal_share_amount: Math.floor(taxableAmount * heir.inheritance_share),
        tax_before_addition: taxBeforeAddition,
        two_fold_addition: 0, // この段階では計算しない
        tax_after_addition: taxBeforeAddition // 加算がないので同額
      });
    }
    
    return {
      legal_heirs: heirs,
      total_heirs_count: heirs.length,
      basic_deduction: basicDeduction,
      taxable_inheritance: taxableEstate,
      total_tax_amount: totalTax,
      heir_tax_details: heirDetails
    };
  }

  /**
   * 実際の分割による相続税計算
   */
  calculateActualDivision(divisionInput: DivisionInput): DivisionResult {
    const heirs = divisionInput.heirs;
    const totalTaxByLegalShare = divisionInput.total_tax_amount;
    const totalTaxableAmount = divisionInput.total_amount;

    // 実際の取得金額を取得
    let actualAmounts: Record<string, number>;
    if (divisionInput.mode === 'amount') {
      actualAmounts = divisionInput.amounts || {};
    } else { // percentage
      actualAmounts = this.convertPercentageToAmount(
        divisionInput.percentages || {},
        totalTaxableAmount,
        divisionInput.rounding_method || 'round'
      );
    }

    const totalActualAmount = Object.values(actualAmounts).reduce((sum, amount) => sum + amount, 0);
    const safeTotal = totalActualAmount === 0 ? 1 : totalActualAmount; // ゼロ除算を回避

    const heirDetails: HeirTaxDetail[] = [];
    let calculatedFinalTaxTotal = 0;

    for (const heir of heirs) {
      const actualAmount = actualAmounts[heir.id] || 0;
      const actualShare = actualAmount / safeTotal;
      
      const proportionalTax = Math.floor(totalTaxByLegalShare * actualShare);
      
      let adjustmentAmount = 0;
      
      // 2割加算
      if (heir.two_fold_addition) {
        const surcharge = Math.floor(proportionalTax * 0.2);
        adjustmentAmount += surcharge;
      }

      // 配偶者税額軽減
      if (heir.heir_type === HeirType.SPOUSE) {
        const spouseStatutoryShare = this.calculateSpouseLegalShare(heirs);
        const reductionAssetLimit = Math.max(160_000_000, totalTaxableAmount * spouseStatutoryShare);
        const reductionBaseAmount = Math.min(actualAmount, reductionAssetLimit);
        
        const baseForReductionCalc = totalTaxableAmount > 0 ? totalTaxableAmount : 1;
        const maxReduction = Math.floor(totalTaxByLegalShare * (reductionBaseAmount / baseForReductionCalc));
        
        const deduction = Math.min(proportionalTax, maxReduction);
        adjustmentAmount -= deduction;
      }
      
      const finalTax = Math.max(0, proportionalTax + adjustmentAmount);
      calculatedFinalTaxTotal += finalTax;

      heirDetails.push({
        heir_id: heir.id,
        heir_name: heir.name,
        name: heir.name,
        relationship: heir.relationship,
        inheritance_amount: actualAmount,
        tax_amount: proportionalTax,
        surcharge_deduction_amount: adjustmentAmount,
        final_tax_amount: finalTax
      });
    }

    return {
      taxable_amount: totalTaxableAmount,
      basic_deduction: this.calculateBasicDeduction(heirs),
      taxable_estate: Math.max(0, totalTaxableAmount - this.calculateBasicDeduction(heirs)),
      total_tax_amount: calculatedFinalTaxTotal,
      heir_details: heirDetails
    };
  }

  /**
   * 割合を金額に変換
   */
  private convertPercentageToAmount(
    percentages: Record<string, number>,
    totalAmount: number,
    roundingMethod: string
  ): Record<string, number> {
    const amounts: Record<string, number> = {};
    for (const [heirId, percentage] of Object.entries(percentages)) {
      const amount = totalAmount * (percentage / 100);
      if (roundingMethod === 'round') {
        amounts[heirId] = Math.round(amount);
      } else if (roundingMethod === 'floor') {
        amounts[heirId] = Math.floor(amount);
      } else { // ceil
        amounts[heirId] = Math.ceil(amount);
      }
    }
    return amounts;
  }

  /**
   * 配偶者の法定相続分を取得
   */
  private calculateSpouseLegalShare(heirs: Heir[]): number {
    for (const heir of heirs) {
      if (heir.heir_type === HeirType.SPOUSE) {
        return heir.inheritance_share;
      }
    }
    return 0.0;
  }

  /**
   * 税額速算表から税額を計算
   */
  private calculateTaxFromTable(amount: number): number {
    for (const row of TAX_TABLE) {
      if (amount <= row.max_amount) {
        const tax = (amount * row.tax_rate) - row.deduction;
        return Math.floor(tax);
      }
    }
    return 0;
  }

  /**
   * 分割入力データのバリデーション
   */
  validateDivisionInput(divisionInput: DivisionInput, heirs: Heir[]): ValidationResult {
    const errors: ValidationError[] = [];

    if (divisionInput.mode === 'amount') {
      if (!divisionInput.amounts) {
        errors.push({
          field: "amounts",
          code: "MISSING",
          message: "各人の取得金額を入力してください。"
        });
      } else {
        // すべての相続人が金額辞書に含まれているかチェック
        for (const heir of heirs) {
          if (!(heir.id in divisionInput.amounts)) {
            errors.push({
              field: "amounts",
              code: "MISSING_HEIR",
              message: `${heir.name}の金額がありません。`
            });
          }
        }
        
        const totalAmounts = Object.values(divisionInput.amounts).reduce((sum, amount) => sum + amount, 0);
        if (totalAmounts !== divisionInput.total_amount) {
          errors.push({
            field: "amounts",
            code: "INVALID_SUM",
            message: `取得金額の合計(${totalAmounts})が課税価格の合計額(${divisionInput.total_amount})と一致しません。`
          });
        }
      }
    } else if (divisionInput.mode === 'percentage') {
      if (!divisionInput.percentages) {
        errors.push({
          field: "percentages",
          code: "MISSING",
          message: "各人の取得割合を入力してください。"
        });
      } else {
        for (const heir of heirs) {
          if (!(heir.id in divisionInput.percentages)) {
            errors.push({
              field: "percentages",
              code: "MISSING_HEIR",
              message: `${heir.name}の割合がありません。`
            });
          }
        }

        const totalPercentages = Object.values(divisionInput.percentages).reduce((sum, percentage) => sum + percentage, 0);
        if (Math.round(totalPercentages * 100000) / 100000 !== 100.0) {
          errors.push({
            field: "percentages",
            code: "INVALID_SUM",
            message: "取得割合の合計が100%になりません。"
          });
        }
      }
    }

    return {
      is_valid: errors.length === 0,
      errors: errors
    };
  }

  /**
   * 家族構成入力のバリデーション
   */
  validateFamilyStructure(familyStructure: FamilyStructure): ValidationResult {
    const errors: ValidationError[] = [];
    
    // 基本的な数値チェック
    if (familyStructure.children_count < 0) {
      errors.push({
        field: "children_count",
        code: "INVALID_VALUE",
        message: "子供の数は0以上である必要があります"
      });
    }
    
    if (familyStructure.adopted_children_count < 0) {
      errors.push({
        field: "adopted_children_count",
        code: "INVALID_VALUE",
        message: "養子の数は0以上である必要があります"
      });
    }
    
    if (familyStructure.grandchild_adopted_count < 0) {
      errors.push({
        field: "grandchild_adopted_count",
        code: "INVALID_VALUE",
        message: "孫養子の数は0以上である必要があります"
      });
    }
    
    if (familyStructure.parents_alive < 0) {
      errors.push({
        field: "parents_alive",
        code: "INVALID_VALUE",
        message: "親の生存数は0以上である必要があります"
      });
    }
    
    if (familyStructure.siblings_count < 0) {
      errors.push({
        field: "siblings_count",
        code: "INVALID_VALUE",
        message: "兄弟姉妹の数は0以上である必要があります"
      });
    }
    
    if (familyStructure.half_siblings_count < 0) {
      errors.push({
        field: "half_siblings_count",
        code: "INVALID_VALUE",
        message: "半血兄弟姉妹の数は0以上である必要があります"
      });
    }
    
    // 法定相続人の存在チェック
    const totalHeirs = (familyStructure.spouse_exists ? 1 : 0) +
                      familyStructure.children_count +
                      familyStructure.parents_alive +
                      familyStructure.siblings_count +
                      familyStructure.half_siblings_count;
    
    if (totalHeirs === 0) {
      errors.push({
        field: "general",
        code: "NO_HEIRS",
        message: "法定相続人が存在しません"
      });
    }

    return {
      is_valid: errors.length === 0,
      errors: errors
    };
  }
}

