'use client';

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Calculator,
  Percent,
  DollarSign,
  Plus,
  Minus,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react';
import {
  Heir,
  HeirType,
  FamilyStructure,
  DivisionInput
} from '@/types/inheritance';

interface ActualDivisionFormProps {
  heirs: Heir[];
  totalAmount: number;
  totalTaxAmount: number;
  _familyStructure: FamilyStructure;
  onSubmit: (data: DivisionInput) => void;
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
  onSubmit,
  isLoading = false
}: ActualDivisionFormProps) {
  const [formData, setFormData] = useState<DivisionFormData>(() => {
    const initialAmounts: Record<string, string> = {};
    const initialPercentages: Record<string, string> = {};

    const legalHeirs = heirs.filter(heir => heir.heir_type !== HeirType.OTHER);

    legalHeirs.forEach(heir => {
        initialAmounts[heir.id] = (totalAmount * heir.inheritance_share).toFixed(0);
        initialPercentages[heir.id] = (heir.inheritance_share * 100).toFixed(2);
    });

    const nonHeirPersons = heirs
      .filter(heir => heir.heir_type === HeirType.OTHER)
      .map(heir => ({ id: heir.id, name: heir.name }));

    nonHeirPersons.forEach(person => {
      initialAmounts[person.id] = '0';
      initialPercentages[person.id] = '0';
    });

    return {
      mode: 'amount',
      amounts: initialAmounts,
      percentages: initialPercentages,
      roundingMethod: 'round',
      nonHeirPersons,
    };
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const { totalInputAmount, totalInputPercentage } = useMemo(() => {
    const totalInputAmount = Object.values(formData.amounts).reduce((sum, amount) => sum + Number(amount || '0'), 0);
    const totalInputPercentage = Object.values(formData.percentages).reduce((sum, p) => sum + Number(p || '0'), 0);
    return { totalInputAmount, totalInputPercentage };
  }, [formData.amounts, formData.percentages]);
  
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('ja-JP').format(Math.round(amount));
  };

  const calculatePercentage = (amount: string) => {
    const numericAmount = Number(amount.replace(/,/g, ''));
    if (!totalAmount || isNaN(numericAmount) || numericAmount === 0) return '0.00';
    return ((numericAmount / totalAmount) * 100).toFixed(2);
  };

  const calculateAmountFromPercentage = (percentage: string) => {
    const numericPercentage = Number(percentage);
    if (isNaN(numericPercentage) || totalAmount === 0) return formatCurrency(0);
    return formatCurrency(totalAmount * (numericPercentage / 100));
  };
  
  const formatNumber = (value: string): string => {
    return value.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleAmountChange = (heirId: string, value: string) => {
    const numericValue = value.replace(/[^0-9]/g, '');
    setFormData(prev => ({
      ...prev,
      amounts: { ...prev.amounts, [heirId]: numericValue }
    }));
  };

  const handlePercentageChange = (heirId: string, value: string) => {
    const numericValue = value.replace(/[^0-9.]/g, '');
    setFormData(prev => ({
      ...prev,
      percentages: { ...prev.percentages, [heirId]: numericValue }
    }));
  };

  const addNonHeirPerson = () => {
    const newId = `non_heir_${Date.now()}`;
    const newName = `法定相続人以外${formData.nonHeirPersons.length + 1}`;
    setFormData(prev => ({
      ...prev,
      nonHeirPersons: [...prev.nonHeirPersons, { id: newId, name: newName }],
      amounts: { ...prev.amounts, [newId]: '0' },
      percentages: { ...prev.percentages, [newId]: '0' },
    }));
  };

  const removeNonHeirPerson = (personId: string) => {
    setFormData(prev => {
      const newAmounts = { ...prev.amounts };
      delete newAmounts[personId];
      const newPercentages = { ...prev.percentages };
      delete newPercentages[personId];
      return {
        ...prev,
        nonHeirPersons: prev.nonHeirPersons.filter(p => p.id !== personId),
        amounts: newAmounts,
        percentages: newPercentages,
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
      if (Math.round(totalInputAmount) !== totalAmount) {
        newErrors.total = `合計額(${formatCurrency(totalInputAmount)}円)が課税価格(${formatCurrency(totalAmount)}円)と一致しません。`;
      }
    } else {
      if (Math.abs(totalInputPercentage - 100) > 0.01) {
        newErrors.total = `合計割合(${totalInputPercentage.toFixed(2)}%)が100%になりません。`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const allHeirsAndRecipients = [
      ...heirs.filter(h => h.heir_type !== HeirType.OTHER),
      ...formData.nonHeirPersons.map(p => ({
        id: p.id, name: p.name, heir_type: HeirType.OTHER,
        relationship: 'other', inheritance_share: 0, two_fold_addition: true
      } as Heir))
    ];

    const divisionData: DivisionInput = {
      heirs: allHeirsAndRecipients,
      total_amount: totalAmount,
      total_tax_amount: totalTaxAmount,
      mode: formData.mode,
      rounding_method: formData.roundingMethod,
      amounts: Object.fromEntries(Object.entries(formData.amounts).map(([k, v]) => [k, Number(v)])),
      percentages: Object.fromEntries(Object.entries(formData.percentages).map(([k, v]) => [k, Number(v)])),
    };
    onSubmit(divisionData);
  };

  const allRecipients = useMemo(() => [
    ...heirs.filter(h => h.heir_type !== HeirType.OTHER),
    ...formData.nonHeirPersons
  ], [heirs, formData.nonHeirPersons]);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>分割方式の選択</CardTitle>
          <CardDescription>金額で指定するか、割合で指定するかを選択してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={formData.mode} onValueChange={(v) => setFormData(p => ({ ...p, mode: v as 'amount' | 'percentage' }))} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="amount"><DollarSign className="mr-2 h-4 w-4" />金額指定</TabsTrigger>
              <TabsTrigger value="percentage"><Percent className="mr-2 h-4 w-4" />割合指定</TabsTrigger>
            </TabsList>
            
            {/* 金額指定タブ */}
            <TabsContent value="amount" className="mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  各相続人が実際に取得する金額を入力してください。合計が課税価格の合計額と一致する必要があります。
                </AlertDescription>
              </Alert>
              <div className="space-y-4 mt-4">
                {allRecipients.map((recipient) => (
                  <div key={recipient.id} className="p-4 border rounded-md space-y-2">
                    {heirs.find(h => h.id === recipient.id) ? (
                       <Label htmlFor={`amount-${recipient.id}`} className="font-semibold">{recipient.name}</Label>
                    ) : (
                      <Input value={recipient.name} onChange={e => updateNonHeirPersonName(recipient.id, e.target.value)} />
                    )}
                    <div className="flex items-center space-x-2">
                      <Input
                        id={`amount-${recipient.id}`}
                        value={formatNumber(formData.amounts[recipient.id] || '')}
                        onChange={(e) => handleAmountChange(recipient.id, e.target.value)}
                        className="w-full text-right"
                      />
                      <span>円</span>
                      <span className="text-sm text-gray-500 w-24 text-right">({calculatePercentage(formData.amounts[recipient.id] || '0')}%)</span>
                      {!heirs.find(h => h.id === recipient.id) && (
                         <Button variant="ghost" size="icon" onClick={() => removeNonHeirPerson(recipient.id)}><Minus className="h-4 w-4" /></Button>
                      )}
                    </div>
                  </div>
                ))}
                <Button type="button" variant="outline" onClick={addNonHeirPerson}><Plus className="mr-2 h-4 w-4" /> 法定相続人以外を追加</Button>
                <div className="p-4 border rounded-md font-semibold flex justify-between items-center">
                  <span>合計取得金額:</span>
                  <div className='text-right'>
                    <span>{formatCurrency(totalInputAmount)} 円</span>
                    <span className="text-sm text-gray-500 ml-2">({(totalInputAmount / totalAmount * 100 || 0).toFixed(2)}%)</span>
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* 割合指定タブ */}
            <TabsContent value="percentage" className="mt-4">
              <Alert>
                <Info className="h-4 w-4" />
                <AlertDescription>
                  各相続人が取得する割合を入力してください。合計が100%になる必要があります。
                </AlertDescription>
              </Alert>
              <div className="space-y-4 mt-4">
                {allRecipients.map((recipient) => (
                   <div key={recipient.id} className="p-4 border rounded-md space-y-2">
                     {heirs.find(h => h.id === recipient.id) ? (
                        <Label htmlFor={`percentage-${recipient.id}`} className="font-semibold">{recipient.name}</Label>
                     ) : (
                       <Input value={recipient.name} onChange={e => updateNonHeirPersonName(recipient.id, e.target.value)} />
                     )}
                     <div className="flex items-center space-x-2">
                       <Input
                         id={`percentage-${recipient.id}`}
                         value={formData.percentages[recipient.id] || ''}
                         onChange={(e) => handlePercentageChange(recipient.id, e.target.value)}
                         className="w-full text-right"
                       />
                       <span>%</span>
                       <span className="text-sm text-gray-500 w-32 text-right">({calculateAmountFromPercentage(formData.percentages[recipient.id] || '0')})</span>
                       {!heirs.find(h => h.id === recipient.id) && (
                          <Button variant="ghost" size="icon" onClick={() => removeNonHeirPerson(recipient.id)}><Minus className="h-4 w-4" /></Button>
                       )}
                     </div>
                   </div>
                ))}
                <Button type="button" variant="outline" onClick={addNonHeirPerson}><Plus className="mr-2 h-4 w-4" /> 法定相続人以外を追加</Button>
                <div className="p-4 border rounded-md font-semibold flex justify-between">
                  <span>合計取得割合:</span>
                  <div className='text-right'>
                    <span>{totalInputPercentage.toFixed(2)} %</span>
                    <span className="text-sm text-gray-500 ml-2">({formatCurrency(totalAmount)})</span>
                  </div>
                </div>
                <div className="mt-4">
                  <Label>端数処理</Label>
                  <Select value={formData.roundingMethod} onValueChange={v => setFormData(p => ({ ...p, roundingMethod: v as 'round' | 'floor' | 'ceil' }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="round">四捨五入</SelectItem>
                      <SelectItem value="floor">切り捨て</SelectItem>
                      <SelectItem value="ceil">切り上げ</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {errors.total && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errors.total}</AlertDescription>
        </Alert>
      )}

      <div className="flex justify-center">
        <Button type="submit" size="lg" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Calculator className="mr-2 h-5 w-5" />}
          実際の分割で計算
        </Button>
      </div>
    </form>
  );
}