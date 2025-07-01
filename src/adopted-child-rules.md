# 養子がいる場合の法定相続人の数え方と相続税計算ロジック詳細

## 📋 概要

養子縁組は相続税の計算において重要な影響を与える制度です。民法上は養子の数に制限はありませんが、相続税法上は基礎控除額等の計算において養子の数に制限が設けられています。

## 🏛️ 法的根拠

### 国税庁タックスアンサー No.4170「相続人の中に養子がいるとき」
- **実子がいる場合**: 養子は1人まで法定相続人の数に含める
- **実子がいない場合**: 養子は2人まで法定相続人の数に含める

### 相続税法第15条（基礎控除）
基礎控除額 = 3,000万円 + 600万円 × 法定相続人の数

## 🧮 養子の制限ルール

### 1. 基本的な制限

```typescript
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
```

### 2. 制限の詳細

#### 🔹 実子がいる場合
- **制限**: 養子1人まで
- **理由**: 相続税回避の防止
- **例**: 実子2人 + 養子3人 → 法定相続人数は4人（実子2人 + 養子1人 + 配偶者1人）

#### 🔹 実子がいない場合
- **制限**: 養子2人まで
- **理由**: 一定の相続税軽減は認めるが、過度な回避は防止
- **例**: 養子4人 → 法定相続人数は3人（養子2人 + 配偶者1人）

## 🎯 制限の例外（実子として扱われる養子）

### 国税庁タックスアンサー No.4170より

以下の養子は**実子として扱われ**、制限の対象外となります：

#### 1. 特別養子縁組による養子
```typescript
// 特別養子縁組の場合は制限なし
if (relationship === RelationshipType.SPECIAL_ADOPTED) {
  count += 1; // 制限適用外
}
```

#### 2. 配偶者の実子（連れ子）
```typescript
// 配偶者の実子で養子になった場合
if (relationship === RelationshipType.STEPCHILD_ADOPTED) {
  count += 1; // 制限適用外
}
```

#### 3. 配偶者の特別養子が後に養子になった場合
```typescript
// 配偶者との結婚前に特別養子縁組により配偶者の養子となっていた人で、
// 結婚後に被相続人の養子となった場合
if (relationship === RelationshipType.SPOUSE_SPECIAL_ADOPTED) {
  count += 1; // 制限適用外
}
```

#### 4. 代襲相続人
```typescript
// 実子・養子・直系卑属が既に死亡または相続権を失った場合の代襲相続人
if (relationship === RelationshipType.SUBSTITUTE_HEIR) {
  count += 1; // 制限適用外
}
```

## 🚫 不当減少養子否認規定

### 相続税法第63条
```typescript
/**
 * 養子の数を法定相続人の数に含めることで相続税の負担を
 * 不当に減少させる結果となると認められる場合、
 * その原因となる養子の数は制限数に含めることはできない
 */
if (isUnfairTaxReductionPurpose(adoption)) {
  // 該当する養子は法定相続人数にカウントしない
  adoptedCount = 0;
}
```

### 判定基準
- 明らかな相続税回避目的
- 養子縁組の実質的な親子関係の有無
- 養子縁組の時期と相続開始時期の関係

## 🔢 計算への影響

### 1. 基礎控除額への影響

```typescript
/**
 * 基礎控除額の計算
 */
calculateBasicDeduction(heirs: Heir[]): number {
  const legalHeirsCount = this.countLegalHeirsForDeduction(heirs);
  return BASIC_DEDUCTION_BASE + (BASIC_DEDUCTION_PER_HEIR * legalHeirsCount);
}

// 例：実子2人 + 養子3人 + 配偶者1人の場合
// 法定相続人数 = 4人（実子2人 + 養子1人 + 配偶者1人）
// 基礎控除額 = 3,000万円 + 600万円 × 4人 = 5,400万円
```

### 2. 生命保険金・死亡退職金の非課税限度額への影響

```typescript
/**
 * 生命保険金の非課税限度額
 */
const lifeInsuranceExemption = 5_000_000 * legalHeirsCount;

/**
 * 死亡退職金の非課税限度額
 */
const retirementExemption = 5_000_000 * legalHeirsCount;
```

### 3. 相続税の総額計算への影響

```typescript
/**
 * 法定相続分による相続税の総額計算
 * 養子の制限は法定相続分の計算には影響しない
 */
for (const heir of heirs) {
  // 全ての養子が法定相続分を持つ
  const inheritanceShare = heir.inheritance_share;
  const taxableAmount = taxableEstate * inheritanceShare;
  const tax = calculateTaxFromTable(taxableAmount);
  totalTax += tax;
}
```

## ⚠️ 2割加算との関係

### 孫養子の特別扱い

```typescript
/**
 * 孫養子の2割加算
 * 国税庁タックスアンサー No.4157より
 */
if (heir.relationship === RelationshipType.GRANDCHILD_ADOPTED) {
  // 代襲相続人でない孫養子は2割加算の対象
  if (!heir.is_substitute_heir) {
    const surcharge = Math.floor(proportionalTax * 0.2);
    adjustmentAmount += surcharge;
  }
}
```

### 2割加算の対象者
- **対象**: 一親等の血族・配偶者以外
- **孫養子**: 代襲相続人でない場合は2割加算
- **兄弟姉妹**: 2割加算の対象
- **甥・姪**: 2割加算の対象

## 📊 実装例とテストケース

### ケース1: 実子あり + 養子複数

```typescript
// 入力: 配偶者1人 + 実子2人 + 養子3人
const familyStructure = {
  spouse_exists: true,
  children_count: 5,
  adopted_children_count: 3,
  // ...
};

// 結果
// 法定相続人数（基礎控除用）: 4人（配偶者1 + 実子2 + 養子1）
// 基礎控除額: 5,400万円
// 法定相続分: 全ての子（実子2 + 養子3）が均等に1/10ずつ
```

### ケース2: 実子なし + 養子複数

```typescript
// 入力: 配偶者1人 + 養子4人
const familyStructure = {
  spouse_exists: true,
  children_count: 4,
  adopted_children_count: 4,
  // ...
};

// 結果
// 法定相続人数（基礎控除用）: 3人（配偶者1 + 養子2）
// 基礎控除額: 4,800万円
// 法定相続分: 全ての養子4人が均等に1/8ずつ
```

### ケース3: 特別養子縁組

```typescript
// 入力: 配偶者1人 + 実子1人 + 特別養子2人 + 普通養子2人
const familyStructure = {
  spouse_exists: true,
  children_count: 5,
  adopted_children_count: 4,
  special_adopted_count: 2,
  // ...
};

// 結果
// 法定相続人数（基礎控除用）: 5人（配偶者1 + 実子1 + 特別養子2 + 普通養子1）
// 基礎控除額: 6,000万円
```

## 🔧 実装上の注意点

### 1. 制限の適用範囲
- **基礎控除額**: 制限適用
- **生命保険金非課税枠**: 制限適用
- **死亡退職金非課税枠**: 制限適用
- **法定相続分**: 制限適用なし（全ての養子が相続権を持つ）

### 2. TypeScript型定義

```typescript
export interface FamilyStructure {
  spouse_exists: boolean;
  children_count: number;
  adopted_children_count: number;
  special_adopted_count?: number;      // 特別養子の数
  stepchild_adopted_count?: number;    // 連れ子養子の数
  grandchild_adopted_count: number;    // 孫養子の数
  // ...
}

export enum RelationshipType {
  CHILD = 'child',
  ADOPTED_CHILD = 'adopted_child',
  SPECIAL_ADOPTED = 'special_adopted',
  STEPCHILD_ADOPTED = 'stepchild_adopted',
  GRANDCHILD_ADOPTED = 'grandchild_adopted',
  // ...
}
```

### 3. バリデーション

```typescript
/**
 * 養子数のバリデーション
 */
validateAdoptedChildren(familyStructure: FamilyStructure): ValidationResult {
  const errors: ValidationError[] = [];
  
  if (familyStructure.adopted_children_count > familyStructure.children_count) {
    errors.push({
      field: "adopted_children_count",
      code: "INVALID_COUNT",
      message: "養子の数は子供の総数を超えることはできません"
    });
  }
  
  return {
    is_valid: errors.length === 0,
    errors: errors
  };
}
```

## 📈 相続税軽減効果の計算

### 養子1人追加による軽減効果

```typescript
/**
 * 養子1人追加による基礎控除額の増加
 */
const additionalDeduction = 6_000_000; // 600万円

/**
 * 最高税率55%の場合の最大軽減効果
 */
const maxTaxReduction = additionalDeduction * 0.55; // 330万円
```

### 実際の軽減効果の例

```typescript
// 課税遺産総額: 1億円の場合
// 養子なし: 基礎控除4,800万円 → 課税遺産5,200万円
// 養子1人: 基礎控除5,400万円 → 課税遺産4,600万円
// 軽減効果: 600万円 × 税率 ≈ 120万円〜330万円
```

## 🎯 まとめ

### 重要なポイント
1. **制限の目的**: 過度な相続税回避の防止
2. **制限の範囲**: 基礎控除等の計算のみ（法定相続分は制限なし）
3. **例外規定**: 特別養子縁組等は制限対象外
4. **2割加算**: 孫養子は代襲相続人でない場合は対象
5. **不当減少否認**: 明らかな税務回避目的は否認される可能性

### 実装における考慮事項
- 養子の種類（普通・特別・連れ子・孫養子）の正確な判定
- 基礎控除計算と法定相続分計算の区別
- 2割加算との適切な連携
- 不当減少否認規定への対応

この制限ルールにより、養子縁組による相続税対策には一定の歯止めがかけられており、適正な相続税の課税が確保されています。

