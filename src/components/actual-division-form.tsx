'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Percent, 
  DollarSign, 
  Plus, 
  Minus, 
  AlertCircle, 
  CheckCircle,
  Loader2,
  Info
} from 'lucide-react';
import { 
  Heir, 
  HeirType, 
  RelationshipType,
  FamilyStructure, 
  DivisionResult,
  DivisionInput 
} from '@/types/inheritance';

interface ActualDivisionFormProps {
  heirs: Heir[];
  totalAmount: number;
  totalTaxAmount: number;
  _familyStructure: FamilyStructure;
  onSubmit: (data: DivisionInput) => void;
  result?: DivisionResult | null;
  isLoading?: boolean;
}

interface DivisionFormData {
  mode: 'amount' | 'percentage';
  amounts: Record<string, string>;
  percentages: Record<string, string>;
  roundingMethod: 'round' | 'floor' | 'ceil';
  nonHeirPersons: Array<{ id: string; name: string }>;
}

export function ActualDivisionForm({ 
  heirs, 
  totalAmount, 
  totalTaxAmount, 
  _familyStructure, 
  onSubmit, 
  result,
  isLoading = false 
}: ActualDivisionFormProps) {
  const [formData, setFormData] = useState<DivisionFormData>(() => {
    const initialAmounts: Record<string, string> = {};
    const initialPercentages: Record<string, string> = {};
    
    heirs.forEach(heir => {
      if (heir.heir_type !== HeirType.OTHER) {
        const legalShareAmount = Math.floor(totalAmount * heir.inheritance_share);
        const legalSharePercentage = (heir.inheritance_share * 100).toFixed(1);
        
        initialAmounts[heir.id] = legalShareAmount.toString();
        initialPercentages[heir.id] = legalSharePercentage;
      }
    });

    // 法定相続人以外の人を初期化
    const nonHeirPersons = heirs
      .filter(heir => heir.heir_type === HeirType.OTHER)
      .map(heir => ({ id: heir.id, name: heir.name }));

    nonHeirPersons.forEach(person => {
      initialAmounts[person.id] = '0';
      initialPercentages[person.id] = '0';
    });

    return {
      mode: 'amount' as const,
      amounts: initialAmounts,
      percentages: initialPercentages,
      roundingMethod: 'round' as const,
      nonHeirPersons
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP').format(amount);
  };

  const formatNumber = (value: string): string => {
    const number = value.replace(/[^0-9]/g, '');
    return number.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleAmountChange = (heirId: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      amounts: {
        ...prev.amounts,
        [heirId]: numericValue
      }
    }));
    
    // エラーをクリア
    if (errors[heirId]) {
      setErrors(prev => ({
        ...prev,
        [heirId]: ''
      }));
    }
  };

  const handlePercentageChange = (heirId: string, value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    setFormData(prev => ({
      ...prev,
      percentages: {
        ...prev.percentages,
        [heirId]: numericValue
      }
    }));
    
    // エラーをクリア
    if (errors[heirId]) {
      setErrors(prev => ({
        ...prev,
        [heirId]: ''
      }));
    }
  };

  const addNonHeirPerson = () => {
    const newId = `non_heir_${Date.now()}`;
    const newName = `法定相続人以外${formData.nonHeirPersons.length + 1}`;
    
    setFormData(prev => ({
      ...prev,
      nonHeirPersons: [...prev.nonHeirPersons, { id: newId, name: newName }],
      amounts: { ...prev.amounts, [newId]: '0' },
      percentages: { ...prev.percentages, [newId]: '0' }
    }));
  };

  const removeNonHeirPerson = (personId: string) => {
    setFormData(prev => {
      const newAmounts = { ...prev.amounts };
      const newPercentages = { ...prev.percentages };
      delete newAmounts[personId];
      delete newPercentages[personId];
      
      return {
        ...prev,
        nonHeirPersons: prev.nonHeirPersons.filter(p => p.id !== personId),
        amounts: newAmounts,
        percentages: newPercentages
      };
    });
  };

  const updateNonHeirPersonName = (personId: string, newName: string) => {
    setFormData(prev => ({
      ...prev,
      nonHeirPersons: prev.nonHeirPersons.map(p => 
        p.id === personId ? { ...p, name: newName } : p
      )
    }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.mode === 'amount') {
      let totalInputAmount = 0;
      
      // 法定相続人の金額チェック
      heirs.filter(h => h.heir_type !== HeirType.OTHER).forEach(heir => {
        const amount = parseInt(formData.amounts[heir.id] || '0');
        if (isNaN(amount) || amount < 0) {
          newErrors[heir.id] = '正しい金額を入力してください';
        }
        totalInputAmount += amount;
      });
      
      // 法定相続人以外の人の金額チェック
      formData.nonHeirPersons.forEach(person => {
        const amount = parseInt(formData.amounts[person.id] || '0');
        if (isNaN(amount) || amount < 0) {
          newErrors[person.id] = '正しい金額を入力してください';
        }
        totalInputAmount += amount;
      });
      
      if (totalInputAmount !== totalAmount) {
        newErrors.total = `取得金額の合計（${formatCurrency(totalInputAmount)}円）が課税価格の合計額（${formatCurrency(totalAmount)}円）と一致しません`;
      }
    } else {
      let totalPercentage = 0;
      
      // 法定相続人の割合チェック
      heirs.filter(h => h.heir_type !== HeirType.OTHER).forEach(heir => {
        const percentage = parseFloat(formData.percentages[heir.id] || '0');
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          newErrors[heir.id] = '0-100の範囲で入力してください';
        }
        totalPercentage += percentage;
      });
      
      // 法定相続人以外の人の割合チェック
      formData.nonHeirPersons.forEach(person => {
        const percentage = parseFloat(formData.percentages[person.id] || '0');
        if (isNaN(percentage) || percentage < 0 || percentage > 100) {
          newErrors[person.id] = '0-100の範囲で入力してください';
        }
        totalPercentage += percentage;
      });
      
      if (Math.abs(totalPercentage - 100) > 0.01) {
        newErrors.total = `取得割合の合計（${totalPercentage.toFixed(1)}%）が100%と一致しません`;
      }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    // 全ての相続人（法定相続人 + 法定相続人以外）を含むリストを作成
    const allHeirs = [
      ...heirs.filter(h => h.heir_type !== HeirType.OTHER),
      ...formData.nonHeirPersons.map(person => ({
        id: person.id,
        name: person.name,
        heir_type: HeirType.OTHER,
        relationship: RelationshipType.OTHER,
        inheritance_share: 0,
        two_fold_addition: true
      }))
    ];

    const divisionData: DivisionInput = {
      heirs: allHeirs,
      total_amount: totalAmount,
      total_tax_amount: totalTaxAmount,
      mode: formData.mode,
      rounding_method: formData.roundingMethod
    };

    if (formData.mode === 'amount') {
      const amounts: Record<string, number> = {};
      Object.entries(formData.amounts).forEach(([heirId, amount]) => {
        amounts[heirId] = parseInt(amount);
      });
      divisionData.amounts = amounts;
    } else {
      const percentages: Record<string, number> = {};
      Object.entries(formData.percentages).forEach(([heirId, percentage]) => {
        percentages[heirId] = parseFloat(percentage);
      });
      divisionData.percentages = percentages;
    }

    onSubmit(divisionData);
  };

  const legalHeirs = heirs.filter(h => h.heir_type !== HeirType.OTHER);

  return (
    <div className="space-y-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 入力方式選択 */}
        <Card className="border-indigo-200 bg-indigo-50/30">
          <CardHeader>
            <CardTitle className="text-indigo-900 flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              分割方式の選択
            </CardTitle>
            <CardDescription className="text-indigo-700">
              金額で指定するか、割合で指定するかを選択してください
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs 
              value={formData.mode} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, mode: value as 'amount' | 'percentage' }))}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="amount" className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  金額指定
                </TabsTrigger>
                <TabsTrigger value="percentage" className="flex items-center gap-2">
                  <Percent className="h-4 w-4" />
                  割合指定
                </TabsTrigger>
              </TabsList>

              <TabsContent value="amount" className="space-y-4 mt-4">
                <Alert className="border-blue-200 bg-blue-50">
                  <Info className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800">
                    各相続人が実際に取得する金額を入力してください。合計が課税価格の合計額と一致する必要があります。
                  </AlertDescription>
                </Alert>

                {/* 法定相続人の金額入力 */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">法定相続人</h4>
                  {legalHeirs.map(heir => (
                    <div key={heir.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{heir.name}</span>
                          <Badge variant="outline">{heir.relationship}</Badge>
                          {heir.two_fold_addition && (
                            <Badge variant="destructive" className="text-xs">2割加算</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          法定相続分: {formatCurrency(Math.floor(totalAmount * heir.inheritance_share))}円
                        </div>
                      </div>
                      <div className="w-48">
                        <div className="relative">
                          <Input
                            type="text"
                            value={formatNumber(formData.amounts[heir.id] || '0')}
                            onChange={(e) => handleAmountChange(heir.id, e.target.value)}
                            className={`text-right pr-8 ${errors[heir.id] ? 'border-red-500' : ''}`}
                            disabled={isLoading}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                            円
                          </span>
                        </div>
                        {errors[heir.id] && (
                          <p className="text-sm text-red-500 mt-1">{errors[heir.id]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 法定相続人以外の人の金額入力 */}
                {formData.nonHeirPersons.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">法定相続人以外</h4>
                    {formData.nonHeirPersons.map(person => (
                      <div key={person.id} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Input
                              type="text"
                              value={person.name}
                              onChange={(e) => updateNonHeirPersonName(person.id, e.target.value)}
                              className="w-48 text-sm"
                              disabled={isLoading}
                            />
                            <Badge variant="destructive" className="text-xs">2割加算</Badge>
                          </div>
                        </div>
                        <div className="w-48">
                          <div className="relative">
                            <Input
                              type="text"
                              value={formatNumber(formData.amounts[person.id] || '0')}
                              onChange={(e) => handleAmountChange(person.id, e.target.value)}
                              className={`text-right pr-8 ${errors[person.id] ? 'border-red-500' : ''}`}
                              disabled={isLoading}
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                              円
                            </span>
                          </div>
                          {errors[person.id] && (
                            <p className="text-sm text-red-500 mt-1">{errors[person.id]}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeNonHeirPerson(person.id)}
                          disabled={isLoading}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="percentage" className="space-y-4 mt-4">
                <Alert className="border-green-200 bg-green-50">
                  <Info className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    各相続人が取得する割合を入力してください。合計が100%になる必要があります。
                  </AlertDescription>
                </Alert>

                {/* 端数処理方法選択 */}
                <div className="space-y-2">
                  <Label className="text-sm font-medium">端数処理方法</Label>
                  <Select 
                    value={formData.roundingMethod} 
                    onValueChange={(value) => setFormData(prev => ({ ...prev, roundingMethod: value as 'round' | 'floor' | 'ceil' }))}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round">四捨五入</SelectItem>
                      <SelectItem value="floor">切り捨て</SelectItem>
                      <SelectItem value="ceil">切り上げ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 法定相続人の割合入力 */}
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">法定相続人</h4>
                  {legalHeirs.map(heir => (
                    <div key={heir.id} className="flex items-center gap-4 p-3 bg-white rounded-lg border">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium">{heir.name}</span>
                          <Badge variant="outline">{heir.relationship}</Badge>
                          {heir.two_fold_addition && (
                            <Badge variant="destructive" className="text-xs">2割加算</Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          法定相続分: {(heir.inheritance_share * 100).toFixed(1)}%
                        </div>
                      </div>
                      <div className="w-32">
                        <div className="relative">
                          <Input
                            type="text"
                            value={formData.percentages[heir.id] || '0'}
                            onChange={(e) => handlePercentageChange(heir.id, e.target.value)}
                            className={`text-right pr-8 ${errors[heir.id] ? 'border-red-500' : ''}`}
                            disabled={isLoading}
                          />
                          <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                            %
                          </span>
                        </div>
                        {errors[heir.id] && (
                          <p className="text-sm text-red-500 mt-1">{errors[heir.id]}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* 法定相続人以外の人の割合入力 */}
                {formData.nonHeirPersons.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium text-gray-900">法定相続人以外</h4>
                    {formData.nonHeirPersons.map(person => (
                      <div key={person.id} className="flex items-center gap-4 p-3 bg-orange-50 rounded-lg border border-orange-200">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Input
                              type="text"
                              value={person.name}
                              onChange={(e) => updateNonHeirPersonName(person.id, e.target.value)}
                              className="w-48 text-sm"
                              disabled={isLoading}
                            />
                            <Badge variant="destructive" className="text-xs">2割加算</Badge>
                          </div>
                        </div>
                        <div className="w-32">
                          <div className="relative">
                            <Input
                              type="text"
                              value={formData.percentages[person.id] || '0'}
                              onChange={(e) => handlePercentageChange(person.id, e.target.value)}
                              className={`text-right pr-8 ${errors[person.id] ? 'border-red-500' : ''}`}
                              disabled={isLoading}
                            />
                            <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm">
                              %
                            </span>
                          </div>
                          {errors[person.id] && (
                            <p className="text-sm text-red-500 mt-1">{errors[person.id]}</p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeNonHeirPerson(person.id)}
                          disabled={isLoading}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* 法定相続人以外を追加ボタン */}
            <div className="flex justify-center mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={addNonHeirPerson}
                className="flex items-center gap-2"
                disabled={isLoading}
              >
                <Plus className="h-4 w-4" />
                法定相続人以外を追加
              </Button>
            </div>

            {/* エラー表示 */}
            {errors.total && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.total}</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* 計算ボタン */}
        <div className="flex justify-center">
          <Button 
            type="submit" 
            size="lg" 
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-8 py-3"
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
                実際の分割で計算
              </>
            )}
          </Button>
        </div>
      </form>

      {/* 計算結果表示 */}
      {result && (
        <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm mt-6">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-t-lg">
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle className="h-5 w-5" />
              実際の分割による計算結果
            </CardTitle>
            <CardDescription className="text-green-700">
              配偶者税額軽減・2割加算を適用した最終的な納税額
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">相続人</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">取得金額</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">配分税額</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">加算・減算</th>
                    <th className="text-right py-3 px-4 font-medium text-gray-700">最終納税額</th>
                  </tr>
                </thead>
                <tbody>
                  {result.heir_details.map((detail, index) => (
                    <tr key={detail.heir_id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                      <td className="py-3 px-4">
                        <span className="font-medium">{detail.heir_name || detail.name}</span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(detail.inheritance_amount || 0)}円
                      </td>
                      <td className="py-3 px-4 text-right">
                        {formatCurrency(detail.tax_amount || 0)}円
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className={detail.surcharge_deduction_amount && detail.surcharge_deduction_amount > 0 ? 'text-red-600' : detail.surcharge_deduction_amount && detail.surcharge_deduction_amount < 0 ? 'text-green-600' : ''}>
                          {detail.surcharge_deduction_amount ? (detail.surcharge_deduction_amount > 0 ? '+' : '') + formatCurrency(detail.surcharge_deduction_amount) : '0'}円
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <span className="font-bold text-purple-700">
                          {formatCurrency(detail.final_tax_amount || 0)}円
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-green-50 border-t-2 border-green-200">
                  <tr>
                    <td colSpan={4} className="py-3 px-4 font-semibold text-green-900">
                      合計納税額
                    </td>
                    <td className="py-3 px-4 text-right font-bold text-green-900 text-lg">
                      {formatCurrency(result.total_tax_amount)}円
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

