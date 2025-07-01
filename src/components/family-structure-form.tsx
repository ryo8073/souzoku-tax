'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  AlertCircle, 
  Loader2, 
  Heart, 
  Users, 
  PersonStanding,
  UserCheck,
  UserPlus,
  Coins
} from 'lucide-react';
import { FamilyStructure } from '@/types/inheritance';

interface FormInputData {
  familyStructure: FamilyStructure;
  taxableAmount: number;
}

interface FamilyStructureFormProps {
  onSubmit: (data: FormInputData, formData: FormData) => void;
  initialData?: FormData | null;
  isLoading?: boolean;
}

export interface FormData {
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
  const [formData, setFormData] = useState<FormData>({
    taxableAmount: '', spouseExists: '', childrenCount: '',
    adoptedChildrenCount: '0', grandchildAdoptedCount: '0', parentsAlive: '',
    siblingsCount: '0', halfSiblingsCount: '0', nonHeirsCount: '0'
  });

  const [errors, setErrors] = useState<FormErrors>({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        taxableAmount: initialData.taxableAmount || '',
        spouseExists: initialData.spouseExists || '',
        childrenCount: initialData.childrenCount || '',
        adoptedChildrenCount: initialData.adoptedChildrenCount || '0',
        grandchildAdoptedCount: initialData.grandchildAdoptedCount || '0',
        parentsAlive: initialData.parentsAlive || '',
        siblingsCount: initialData.siblingsCount || '0',
        halfSiblingsCount: initialData.halfSiblingsCount || '0',
        nonHeirsCount: initialData.nonHeirsCount || '0'
      });
    }
  }, [initialData]);

  const formatNumber = (value: string): string => {
    return value.replace(/[^0-9]/g, '').replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  const handleInputChange = (field: keyof FormData, value: string) => {
    const newFormData = { ...formData, [field]: value };

    // 子供の数が変更されたら、養子と孫養子の数をリセットまたは調整
    if (field === 'childrenCount') {
        const childrenNum = parseInt(value) || 0;
        const adoptedNum = parseInt(newFormData.adoptedChildrenCount) || 0;
        if (adoptedNum > childrenNum) {
            newFormData.adoptedChildrenCount = value;
            if (parseInt(newFormData.grandchildAdoptedCount) > childrenNum) {
                newFormData.grandchildAdoptedCount = value;
            }
        }
    }
    
    // 養子の数が変更されたら、孫養子の数をリセットまたは調整
    if (field === 'adoptedChildrenCount') {
        const adoptedNum = parseInt(value) || 0;
        if (parseInt(newFormData.grandchildAdoptedCount) > adoptedNum) {
            newFormData.grandchildAdoptedCount = value;
        }
    }

    setFormData(newFormData);
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};
    const { taxableAmount, spouseExists, childrenCount, adoptedChildrenCount, grandchildAdoptedCount, parentsAlive, siblingsCount, halfSiblingsCount, nonHeirsCount } = formData;
    
    if (!taxableAmount || parseInt(taxableAmount) <= 0) newErrors.taxableAmount = '課税価格の合計額を正の数で入力してください';
    if (spouseExists === '') newErrors.spouseExists = '配偶者の有無を選択してください';
    
    const childrenNum = parseInt(childrenCount);
    const adoptedNum = parseInt(adoptedChildrenCount);
    const grandchildNum = parseInt(grandchildAdoptedCount);

    if (childrenCount === '' || childrenNum < 0) newErrors.childrenCount = '子供の数を0以上で入力してください';
    if (adoptedChildrenCount === '' || adoptedNum < 0) newErrors.adoptedChildrenCount = '養子の数を0以上で入力してください';
    if (grandchildAdoptedCount === '' || grandchildNum < 0) newErrors.grandchildAdoptedCount = '孫養子の数を0以上で入力してください';
    if (childrenNum < adoptedNum) newErrors.adoptedChildrenCount = '養子の数は子供の総数以下である必要があります';
    if (adoptedNum < grandchildNum) newErrors.grandchildAdoptedCount = '孫養子の数は養子の総数以下である必要があります';

    if (childrenNum === 0) {
        if (parentsAlive === '') newErrors.parentsAlive = '親の生存状況を選択してください';
        if (parseInt(parentsAlive) === 0) {
            if (siblingsCount === '' || parseInt(siblingsCount) < 0) newErrors.siblingsCount = '兄弟姉妹の数を0以上で入力してください';
            if (halfSiblingsCount === '' || parseInt(halfSiblingsCount) < 0) newErrors.halfSiblingsCount = '半血兄弟姉妹の数を0以上で入力してください';
        }
    }
    
    if (nonHeirsCount === '' || parseInt(nonHeirsCount) < 0) newErrors.nonHeirsCount = '法定相続人以外の人数を0以上で入力してください';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    
    // API送信用データ
    const apiData = {
      taxableAmount: parseInt(formData.taxableAmount.replace(/,/g, '')),
      familyStructure: {
        spouse_exists: formData.spouseExists === 'true',
        children_count: parseInt(formData.childrenCount) || 0,
        adopted_children_count: parseInt(formData.adoptedChildrenCount) || 0,
        grandchild_adopted_count: parseInt(formData.grandchildAdoptedCount) || 0,
        parents_alive: !hasChildren ? (parseInt(formData.parentsAlive) || 0) : 0,
        siblings_count: !hasChildren && !hasParents ? (parseInt(formData.siblingsCount) || 0) : 0,
        half_siblings_count: !hasChildren && !hasParents ? (parseInt(formData.halfSiblingsCount) || 0) : 0,
        non_heirs_count: parseInt(formData.nonHeirsCount) || 0
      }
    };

    // フォームの生データ(formData)も渡す
    onSubmit(apiData, formData);
  };
  
  const hasChildren = formData.childrenCount !== '' && parseInt(formData.childrenCount) > 0;
  const hasParents = formData.parentsAlive !== '' && parseInt(formData.parentsAlive) > 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      <Card className="border-blue-200 shadow-md transition-shadow hover:shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-3 text-blue-800"><Coins size={24} />課税遺産総額</CardTitle>
          <CardDescription>相続財産の評価額から債務や葬式費用を差し引いた、課税対象となる金額を入力します。</CardDescription>
        </CardHeader>
        <CardContent>
          <Label htmlFor="taxableAmount" className="font-semibold">課税価格の合計額 <span className="text-red-500">*</span></Label>
          <div className="relative mt-2">
            <Input id="taxableAmount" type="text" value={formatNumber(formData.taxableAmount)} onChange={(e) => handleInputChange('taxableAmount', e.target.value.replace(/,/g, ''))} placeholder="例: 100,000,000" className={`text-xl font-mono text-right pr-10 ${errors.taxableAmount ? 'border-red-500' : ''}`} disabled={isLoading} />
            <span className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500">円</span>
          </div>
          {errors.taxableAmount && <Alert variant="destructive" className="mt-2 py-2 px-3"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{errors.taxableAmount}</AlertDescription></Alert>}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-8">
        <Card className="border-rose-200 shadow-md transition-shadow hover:shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-rose-800"><Heart size={24} />配偶者</CardTitle>
            </CardHeader>
            <CardContent>
                <Label htmlFor="spouseExists" className="font-semibold">配偶者の有無 <span className="text-red-500">*</span></Label>
                <Select value={formData.spouseExists} onValueChange={(value) => handleInputChange('spouseExists', value)} disabled={isLoading}>
                    <SelectTrigger className={`mt-2 ${errors.spouseExists ? 'border-red-500' : ''}`}><SelectValue placeholder="選択してください" /></SelectTrigger>
                    <SelectContent><SelectItem value="true">いる</SelectItem><SelectItem value="false">いない</SelectItem></SelectContent>
                </Select>
                {errors.spouseExists && <Alert variant="destructive" className="mt-2 py-2 px-3"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{errors.spouseExists}</AlertDescription></Alert>}
            </CardContent>
        </Card>
        
        <Card className="border-green-200 shadow-md transition-shadow hover:shadow-lg">
            <CardHeader>
                <CardTitle className="flex items-center gap-3 text-green-800"><Users size={24}/>子・孫</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                <div>
                    <Label htmlFor="childrenCount" className="font-semibold">子の総数（実子・養子の合計）<span className="text-red-500">*</span></Label>
                    <Input id="childrenCount" type="number" min="0" value={formData.childrenCount} onChange={(e) => handleInputChange('childrenCount', e.target.value)} className={`mt-2 ${errors.childrenCount ? 'border-red-500' : ''}`} disabled={isLoading} />
                    {errors.childrenCount && <Alert variant="destructive" className="mt-2 py-2 px-3"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{errors.childrenCount}</AlertDescription></Alert>}
                </div>
                {hasChildren && (
                <>
                    <div>
                        <Label htmlFor="adoptedChildrenCount">うち、養子の数</Label>
                        <Input id="adoptedChildrenCount" type="number" min="0" max={parseInt(formData.childrenCount) || 0} value={formData.adoptedChildrenCount} onChange={(e) => handleInputChange('adoptedChildrenCount', e.target.value)} className={`mt-2 ${errors.adoptedChildrenCount ? 'border-red-500' : ''}`} disabled={isLoading} />
                        {errors.adoptedChildrenCount && <Alert variant="destructive" className="mt-2 py-2 px-3"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{errors.adoptedChildrenCount}</AlertDescription></Alert>}
                        <Alert className="mt-2 text-sm text-muted-foreground p-3 bg-gray-50 border-gray-200">
                          <AlertCircle className="h-4 w-4 text-gray-500" />
                          <AlertDescription>
                            <p className="font-semibold text-gray-700">【養子の入力に関するご注意】</p>
                            <p className='mt-1'>通常の養子縁組（普通養子縁組）の場合のみ、こちらの「養子の数」に入力してください。</p>
                            <p className="mt-2 font-semibold text-gray-700">下記に該当する方は「実子」として扱われるため、「養子の数」には含めず「子の総数」に合算してください。</p>
                            <ul className="list-disc pl-5 mt-1 space-y-1">
                              <li>特別養子縁組による養子</li>
                              <li>配偶者の実子（連れ子）で、被相続人の養子となった方</li>
                              <li>代襲相続人となっている養子またはその子</li>
                            </ul>
                          </AlertDescription>
                        </Alert>
                    </div>
                    <div>
                        <Label htmlFor="grandchildAdoptedCount">うち、孫養子（2割加算対象）の数</Label>
                        <Input id="grandchildAdoptedCount" type="number" min="0" max={parseInt(formData.adoptedChildrenCount) || 0} value={formData.grandchildAdoptedCount} onChange={(e) => handleInputChange('grandchildAdoptedCount', e.target.value)} className={`mt-2 ${errors.grandchildAdoptedCount ? 'border-red-500' : ''}`} disabled={isLoading} />
                        {errors.grandchildAdoptedCount && <Alert variant="destructive" className="mt-2 py-2 px-3"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{errors.grandchildAdoptedCount}</AlertDescription></Alert>}
                    </div>
                </>
                )}
            </CardContent>
        </Card>
      </div>
      
      {!hasChildren && (
        <div className="grid md:grid-cols-2 gap-8">
            <Card className="border-purple-200 shadow-md transition-shadow hover:shadow-lg">
                <CardHeader>
                    <CardTitle className="flex items-center gap-3 text-purple-800"><PersonStanding size={24}/>直系尊属（親・祖父母）</CardTitle>
                </CardHeader>
                <CardContent>
                    <Label htmlFor="parentsAlive">生存している親の数 <span className="text-red-500">*</span></Label>
                    <Select value={formData.parentsAlive} onValueChange={(value) => handleInputChange('parentsAlive', value)} disabled={isLoading}>
                        <SelectTrigger className={`mt-2 ${errors.parentsAlive ? 'border-red-500' : ''}`}><SelectValue placeholder="選択してください" /></SelectTrigger>
                        <SelectContent><SelectItem value="0">0人</SelectItem><SelectItem value="1">1人</SelectItem><SelectItem value="2">2人</SelectItem></SelectContent>
                    </Select>
                    {errors.parentsAlive && <Alert variant="destructive" className="mt-2 py-2 px-3"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{errors.parentsAlive}</AlertDescription></Alert>}
                </CardContent>
            </Card>

            {!hasParents && (
                <Card className="border-orange-200 shadow-md transition-shadow hover:shadow-lg">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-3 text-orange-800"><Users size={24}/>兄弟姉妹</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div>
                            <Label htmlFor="siblingsCount">兄弟姉妹（全血）の数 <span className="text-red-500">*</span></Label>
                            <Input id="siblingsCount" type="number" min="0" value={formData.siblingsCount} onChange={(e) => handleInputChange('siblingsCount', e.target.value)} className={`mt-2 ${errors.siblingsCount ? 'border-red-500' : ''}`} disabled={isLoading}/>
                            {errors.siblingsCount && <Alert variant="destructive" className="mt-2 py-2 px-3"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{errors.siblingsCount}</AlertDescription></Alert>}
                        </div>
                        <div>
                            <Label htmlFor="halfSiblingsCount">兄弟姉妹（半血）の数 <span className="text-red-500">*</span></Label>
                            <Input id="halfSiblingsCount" type="number" min="0" value={formData.halfSiblingsCount} onChange={(e) => handleInputChange('halfSiblingsCount', e.target.value)} className={`mt-2 ${errors.halfSiblingsCount ? 'border-red-500' : ''}`} disabled={isLoading}/>
                            {errors.halfSiblingsCount && <Alert variant="destructive" className="mt-2 py-2 px-3"><AlertCircle className="h-4 w-4" /><AlertDescription className="text-sm">{errors.halfSiblingsCount}</AlertDescription></Alert>}
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
      )}

      <Card className="border-gray-200 shadow-md transition-shadow hover:shadow-lg">
          <CardHeader>
              <CardTitle className="flex items-center gap-3 text-gray-800"><UserPlus size={24}/>法定相続人以外</CardTitle>
              <CardDescription>遺言により財産を受け取る法定相続人以外の方がいる場合、その人数を入力します。（2割加算の対象となります）</CardDescription>
          </CardHeader>
          <CardContent>
              <Label htmlFor="nonHeirsCount">法定相続人以外の人数</Label>
              <Input id="nonHeirsCount" type="number" min="0" value={formData.nonHeirsCount} onChange={(e) => handleInputChange('nonHeirsCount', e.target.value)} className="mt-2" disabled={isLoading}/>
          </CardContent>
      </Card>
      
      <div className="flex justify-center pt-6">
        <Button type="submit" size="lg" className="w-full md:w-1/2 text-lg" disabled={isLoading}>
          {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <UserCheck className="mr-2 h-5 w-5" />}
          法定相続人を確定し税額を計算
        </Button>
      </div>
    </form>
  );
}

