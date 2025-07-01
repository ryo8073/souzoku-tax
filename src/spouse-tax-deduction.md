# 配偶者税額軽減 - 分割計算ロジック詳細

## 📋 概要

配偶者税額軽減は、実際の分割計算において配偶者が相続した財産に基づいて適用される税額控除制度です。

## 🧮 核心となる計算ロジック

### 1. 配偶者税額軽減の計算式

```typescript
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
```

### 2. 軽減限度額の決定

```typescript
/**
 * 軽減限度額 = max(1億6千万円, 配偶者の法定相続分相当額)
 */
const reductionAssetLimit = Math.max(160_000_000, totalTaxableAmount * spouseStatutoryShare);
```

### 3. 軽減対象財産額の決定

```typescript
/**
 * 軽減対象財産額 = min(配偶者の実際取得額, 軽減限度額)
 */
const reductionBaseAmount = Math.min(actualAmount, reductionAssetLimit);
```

### 4. 軽減税額の計算

```typescript
/**
 * 軽減税額 = 法定相続分課税による総税額 × (軽減対象財産額 / 課税価格の合計額)
 */
const baseForReductionCalc = totalTaxableAmount > 0 ? totalTaxableAmount : 1;
const maxReduction = Math.floor(totalTaxByLegalShare * (reductionBaseAmount / baseForReductionCalc));

/**
 * 実際の軽減税額 = min(配偶者の按分税額, 軽減税額)
 */
const deduction = Math.min(proportionalTax, maxReduction);
```

## 🔧 実装の詳細

### calculateActualDivision メソッド（抜粋）

```typescript
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
    
    // 按分による税額計算
    const proportionalTax = Math.floor(totalTaxByLegalShare * actualShare);
    
    let adjustmentAmount = 0;
    
    // 2割加算
    if (heir.two_fold_addition) {
      const surcharge = Math.floor(proportionalTax * 0.2);
      adjustmentAmount += surcharge;
    }

    // 🎯 配偶者税額軽減の核心部分
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
```

### 配偶者の法定相続分を取得するヘルパーメソッド

```typescript
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
```

## 📊 計算例

### ケース：課税対象総額3億3千万円、配偶者2億円相続

```typescript
// 入力値
totalTaxableAmount = 330_000_000;  // 課税対象総額
actualAmount = 200_000_000;        // 配偶者実際取得額
spouseStatutoryShare = 0.5;        // 配偶者法定相続分（1/2）
totalTaxByLegalShare = 48_000_000; // 法定相続分課税による総税額
proportionalTax = 25_600_000;      // 配偶者の按分税額

// 計算過程
reductionAssetLimit = Math.max(160_000_000, 330_000_000 * 0.5);
// = Math.max(160_000_000, 165_000_000) = 165_000_000

reductionBaseAmount = Math.min(200_000_000, 165_000_000);
// = 165_000_000

maxReduction = Math.floor(48_000_000 * (165_000_000 / 330_000_000));
// = Math.floor(48_000_000 * 0.5) = 24_000_000

deduction = Math.min(25_600_000, 24_000_000);
// = 24_000_000

// 結果
adjustmentAmount = -24_000_000;  // 軽減額（マイナス）
finalTax = Math.max(0, 25_600_000 + (-24_000_000));
// = Math.max(0, 1_600_000) = 1_600_000
```

## 🔍 重要なポイント

### 1. 軽減限度額の判定
- **1億6千万円** と **法定相続分相当額** の大きい方が軽減限度額
- 配偶者の法定相続分は家族構成により変動（1/2, 2/3, 3/4, 1）

### 2. 実際取得額との比較
- 軽減対象となる財産額は、実際取得額と軽減限度額の小さい方

### 3. 按分計算
- 軽減税額は法定相続分課税による総税額を按分して計算
- 按分比率 = 軽減対象財産額 ÷ 課税価格の合計額

### 4. 上限制御
- 実際の軽減税額は配偶者の按分税額を上限とする

## 🧪 テストケース

### 軽減限度額1億6千万円適用ケース
```typescript
// 課税対象総額: 2億円、配偶者: 1億6千万円相続
totalTaxableAmount = 200_000_000;
actualAmount = 160_000_000;
spouseStatutoryShare = 0.5; // 法定相続分1億円 < 1億6千万円
reductionAssetLimit = 160_000_000; // 1億6千万円が適用
```

### 法定相続分相当額適用ケース
```typescript
// 課税対象総額: 4億円、配偶者: 3億円相続
totalTaxableAmount = 400_000_000;
actualAmount = 300_000_000;
spouseStatutoryShare = 0.5; // 法定相続分2億円 > 1億6千万円
reductionAssetLimit = 200_000_000; // 法定相続分相当額が適用
```

