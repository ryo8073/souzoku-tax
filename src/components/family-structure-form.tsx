'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calculator, AlertCircle, Loader2 } from 'lucide-react';
import { FamilyStructure } from '@/types/inheritance';

interface FormInputData {
  familyStructure: FamilyStructure;
  taxableAmount: number;
}

interface FamilyStructureFormProps {
  onSubmit: (data: FormInputData) => void;
  initialData?: FormInputData | null;
  isLoading?: boolean;
}

interface FormData {
  taxableAmount: string;
  spouseExists: string;
  childrenCount: string;
  adoptedChildrenCount: string;
  grandchildAdoptedCount: string;
  parentsAlive: string;
  siblingsCount: string;
  halfSiblingsCount: string;
  nonHeirsCount: string;
}

interface FormErrors {
  [key: string]: string;
}

export function FamilyStructureForm({ onSubmit, initialData, isLoading = false }: FamilyStructureFormProps) {
  const [formData, setFormData] = useState<FormData>(() => {
    if (initialData) {
      return {
        taxableAmount: initialData.taxableAmount?.toString() || '',
        spouseExists: initialData.familyStructure?.spouse_exists ? 'true' : 'false',
        childrenCount: initialData.familyStructure?.children_count?.toString() || '',
        adoptedChildrenCount: initialData.familyStructure?.adopted_children_count?.toString() || '0',
        grandchildAdoptedCount: initialData.familyStructure?.grandchild_adopted_count?.toString() || '0',
        parentsAlive: initialData.familyStructure?.parents_alive?.toString() || '',
        siblingsCount: initialData.familyStructure?.siblings_count?.toString() || '0',
        halfSiblingsCount: initialData.familyStructure?.half_siblings_count?.toString() || '0',
        nonHeirsCount: initialData.familyStructure?.non_heirs_count?.toString() || '0'
      };
    }
    return {
      taxableAmount: '',
      spouseExists: '',
      childrenCount: '',
      adoptedChildrenCount: '0',
      grandchildAdoptedCount: '0',
      parentsAlive: '',
      siblingsCount: '0',
      halfSiblingsCount: '0',
      nonHeirsCount: '0'
    };
  });

  const [errors, setErrors] = useState<FormErrors>({});

  const formatNumber = (value: string): string => {
    const number = value.replace(/[^0-9]/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    if (field === 'taxableAmount') {
      const numericValue = value.replace(/[^0-9]/g, '');
      setFormData(prev => ({
        ...prev,
        [field]: numericValue
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }));
    }
    
    // エラーをクリア
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // 課税価格の検証
    const taxableAmountNum = parseInt(formData.taxableAmount);
    if (!formData.taxableAmount || taxableAmountNum <= 0) {
      newErrors.taxableAmount = '課税価格の合計額を入力してください';
    }

    // 配偶者の有無の検証
    if (formData.spouseExists === '') {
      newErrors.spouseExists = '配偶者の有無を選択してください';
    }

    // 子供の数の検証
    const childrenCount = parseInt(formData.childrenCount);
    if (formData.childrenCount === '' || childrenCount < 0) {
      newErrors.childrenCount = '子供の数を入力してください（0以上）';
    }

    // 養子の数の検証
    const adoptedChildrenCount = parseInt(formData.adoptedChildrenCount);
    if (formData.adoptedChildrenCount === '' || adoptedChildrenCount < 0) {
      newErrors.adoptedChildrenCount = '養子の数を入力してください（0以上）';
    }

    // 養子の数が子供の総数を超えていないかチェック
    if (adoptedChildrenCount > childrenCount) {
      newErrors.adoptedChildrenCount = '養子の数は子供の総数を超えることはできません';
    }

    // 孫養子の数の検証
    const grandchildAdoptedCount = parseInt(formData.grandchildAdoptedCount);
    if (formData.grandchildAdoptedCount === '' || grandchildAdoptedCount < 0) {
      newErrors.grandchildAdoptedCount = '孫養子の数を入力してください（0以上）';
    }

    // 孫養子の数が養子の数を超えていないかチェック
    if (grandchildAdoptedCount > adoptedChildrenCount) {
      newErrors.grandchildAdoptedCount = '孫養子の数は養子の数を超えることはできません';
    }

    // 親の生存状況の検証
    if (formData.parentsAlive === '') {
      newErrors.parentsAlive = '親の生存状況を選択してください';
    }

    // 兄弟姉妹の数の検証
    const siblingsCount = parseInt(formData.siblingsCount);
    if (formData.siblingsCount === '' || siblingsCount < 0) {
      newErrors.siblingsCount = '全血兄弟姉妹の数を入力してください（0以上）';
    }

    // 半血兄弟姉妹の数の検証
    const halfSiblingsCount = parseInt(formData.halfSiblingsCount);
    if (formData.halfSiblingsCount === '' || halfSiblingsCount < 0) {
      newErrors.halfSiblingsCount = '半血兄弟姉妹の数を入力してください（0以上）';
    }

    // 法定相続人以外の人数の検証
    const nonHeirsCount = parseInt(formData.nonHeirsCount);
    if (formData.nonHeirsCount === '' || nonHeirsCount < 0) {
      newErrors.nonHeirsCount = '法定相続人以外の人数を入力してください（0以上）';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const familyStructure: FamilyStructure = {
      spouse_exists: formData.spouseExists === 'true',
      children_count: parseInt(formData.childrenCount),
      adopted_children_count: parseInt(formData.adoptedChildrenCount),
      grandchild_adopted_count: parseInt(formData.grandchildAdoptedCount),
      parents_alive: parseInt(formData.parentsAlive),
      siblings_count: parseInt(formData.siblingsCount),
      half_siblings_count: parseInt(formData.halfSiblingsCount),
      non_heirs_count: parseInt(formData.nonHeirsCount)
    };

    onSubmit({
      familyStructure,
      taxableAmount: parseInt(formData.taxableAmount)
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 課税価格入力 */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-blue-900 flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            課税価格の合計額
          </CardTitle>
          <CardDescription className="text-blue-700">
            相続財産の評価額から債務・葬式費用を差し引いた金額を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="taxableAmount" className="text-sm font-medium">
              課税価格の合計額 <span className="text-red-500">*</span>
            </Label>
            <div className="relative">
              <Input
                id="taxableAmount"
                type="text"
                value={formatNumber(formData.taxableAmount)}
                onChange={(e) => handleInputChange('taxableAmount', e.target.value)}
                placeholder="例: 100,000,000"
                className={`text-right pr-8 ${errors.taxableAmount ? 'border-red-500' : ''}`}
                disabled={isLoading}
              />
              <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                円
              </span>
            </div>
            {errors.taxableAmount && (
              <Alert variant="destructive" className="py-2">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-sm">{errors.taxableAmount}</AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 家族構成入力 */}
      <Card className="border-green-200 bg-green-50/30">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg text-green-900">家族構成</CardTitle>
          <CardDescription className="text-green-700">
            被相続人の家族構成を入力してください
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 配偶者 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="spouseExists" className="text-sm font-medium">
                配偶者の有無 <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.spouseExists} 
                onValueChange={(value) => handleInputChange('spouseExists', value)}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.spouseExists ? 'border-red-500' : ''}>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">有（存命）</SelectItem>
                  <SelectItem value="false">無</SelectItem>
                </SelectContent>
              </Select>
              {errors.spouseExists && (
                <p className="text-sm text-red-500">{errors.spouseExists}</p>
              )}
            </div>
          </div>

          {/* 子供関連 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="childrenCount" className="text-sm font-medium">
                子供の総数 <span className="text-red-500">*</span>
              </Label>
              <Input
                id="childrenCount"
                type="number"
                min="0"
                value={formData.childrenCount}
                onChange={(e) => handleInputChange('childrenCount', e.target.value)}
                placeholder="0"
                className={errors.childrenCount ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.childrenCount && (
                <p className="text-sm text-red-500">{errors.childrenCount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="adoptedChildrenCount" className="text-sm font-medium">
                うち養子の数
              </Label>
              <Input
                id="adoptedChildrenCount"
                type="number"
                min="0"
                value={formData.adoptedChildrenCount}
                onChange={(e) => handleInputChange('adoptedChildrenCount', e.target.value)}
                placeholder="0"
                className={errors.adoptedChildrenCount ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.adoptedChildrenCount && (
                <p className="text-sm text-red-500">{errors.adoptedChildrenCount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="grandchildAdoptedCount" className="text-sm font-medium">
                うち孫養子の数
              </Label>
              <Input
                id="grandchildAdoptedCount"
                type="number"
                min="0"
                value={formData.grandchildAdoptedCount}
                onChange={(e) => handleInputChange('grandchildAdoptedCount', e.target.value)}
                placeholder="0"
                className={errors.grandchildAdoptedCount ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.grandchildAdoptedCount && (
                <p className="text-sm text-red-500">{errors.grandchildAdoptedCount}</p>
              )}
            </div>
          </div>

          {/* 親 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="parentsAlive" className="text-sm font-medium">
                親の生存状況 <span className="text-red-500">*</span>
              </Label>
              <Select 
                value={formData.parentsAlive} 
                onValueChange={(value) => handleInputChange('parentsAlive', value)}
                disabled={isLoading}
              >
                <SelectTrigger className={errors.parentsAlive ? 'border-red-500' : ''}>
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0">両方死亡</SelectItem>
                  <SelectItem value="1">一方生存</SelectItem>
                  <SelectItem value="2">両方生存</SelectItem>
                </SelectContent>
              </Select>
              {errors.parentsAlive && (
                <p className="text-sm text-red-500">{errors.parentsAlive}</p>
              )}
            </div>
          </div>

          {/* 兄弟姉妹 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="siblingsCount" className="text-sm font-medium">
                全血兄弟姉妹の数
              </Label>
              <Input
                id="siblingsCount"
                type="number"
                min="0"
                value={formData.siblingsCount}
                onChange={(e) => handleInputChange('siblingsCount', e.target.value)}
                placeholder="0"
                className={errors.siblingsCount ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.siblingsCount && (
                <p className="text-sm text-red-500">{errors.siblingsCount}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="halfSiblingsCount" className="text-sm font-medium">
                半血兄弟姉妹の数
              </Label>
              <Input
                id="halfSiblingsCount"
                type="number"
                min="0"
                value={formData.halfSiblingsCount}
                onChange={(e) => handleInputChange('halfSiblingsCount', e.target.value)}
                placeholder="0"
                className={errors.halfSiblingsCount ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.halfSiblingsCount && (
                <p className="text-sm text-red-500">{errors.halfSiblingsCount}</p>
              )}
            </div>
          </div>

          {/* 法定相続人以外 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="nonHeirsCount" className="text-sm font-medium">
                法定相続人以外の人数
              </Label>
              <Input
                id="nonHeirsCount"
                type="number"
                min="0"
                value={formData.nonHeirsCount}
                onChange={(e) => handleInputChange('nonHeirsCount', e.target.value)}
                placeholder="0"
                className={errors.nonHeirsCount ? 'border-red-500' : ''}
                disabled={isLoading}
              />
              {errors.nonHeirsCount && (
                <p className="text-sm text-red-500">{errors.nonHeirsCount}</p>
              )}
              <p className="text-xs text-gray-600">
                遺贈を受ける人など、法定相続人以外で相続財産を取得する人の数
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 送信ボタン */}
      <div className="flex justify-center pt-4">
        <Button 
          type="submit" 
          size="lg" 
          className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white px-8 py-3 text-lg font-semibold shadow-lg"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              計算中...
            </>
          ) : (
            <>
              <Calculator className="mr-2 h-5 w-5" />
              相続税を計算する
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

