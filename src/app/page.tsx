'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calculator, Users, PieChart, FileText, RotateCcw } from 'lucide-react';
import { FamilyStructureForm } from '@/components/family-structure-form';
import { TaxCalculationResult } from '@/components/tax-calculation-result';
import { ActualDivisionForm } from '@/components/actual-division-form';
import { FamilyStructure, Heir, TaxCalculationResult as TaxResult, DivisionResult, DivisionInput } from '@/types/inheritance';

interface FormInputData {
  familyStructure: FamilyStructure;
  taxableAmount: number;
}

export default function InheritanceTaxCalculator() {
  const [familyStructure, setFamilyStructure] = useState<FamilyStructure>({
    spouse_exists: false,
    children_count: 0,
    adopted_children_count: 0,
    grandchild_adopted_count: 0,
    parents_alive: 0,
    siblings_count: 0,
    half_siblings_count: 0,
    non_heirs_count: 0
  });

  const [taxableAmount, setTaxableAmount] = useState<number>(0);
  const [legalHeirs, setLegalHeirs] = useState<Heir[]>([]);
  const [taxCalculationResult, setTaxCalculationResult] = useState<TaxResult | null>(null);
  const [actualDivisionResult, setActualDivisionResult] = useState<DivisionResult | null>(null);
  const [currentStep, setCurrentStep] = useState<string>('family');
  const [formInputData, setFormInputData] = useState<FormInputData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const handleFamilyStructureSubmit = async (data: FormInputData) => {
    setIsLoading(true);
    try {
      // 入力データを保持
      setFormInputData(data);
      setFamilyStructure(data.familyStructure);
      setTaxableAmount(data.taxableAmount);
      
      // 法定相続人判定API呼び出し
      const heirsResponse = await fetch('/api/calculation/heirs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          family_structure: data.familyStructure
        }),
      });
      
      const heirsData = await heirsResponse.json();
      
      if (heirsData.success) {
        setLegalHeirs(heirsData.result.legal_heirs);
        
        // 相続税計算API呼び出し
        const taxResponse = await fetch('/api/calculation/tax-amount', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            taxable_amount: data.taxableAmount,
            family_structure: data.familyStructure
          }),
        });
        
        const taxData = await taxResponse.json();
        
        if (taxData.success) {
          setTaxCalculationResult(taxData.result);
          setCurrentStep('result');
        } else {
          console.error('税額計算エラー:', taxData.error);
          alert('税額計算でエラーが発生しました。');
        }
      } else {
        console.error('法定相続人判定エラー:', heirsData.error);
        alert('法定相続人判定でエラーが発生しました。');
      }
    } catch (error) {
      console.error('計算エラー:', error);
      alert('計算中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const handleActualDivisionSubmit = async (divisionData: DivisionInput) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/calculation/actual-division', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...divisionData,
          heirs: legalHeirs,
          total_amount: taxableAmount,
          total_tax_amount: taxCalculationResult?.total_tax_amount || 0
        }),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setActualDivisionResult(data.result);
      } else {
        console.error('分割計算エラー:', data.error);
        alert('分割計算でエラーが発生しました。');
      }
    } catch (error) {
      console.error('分割計算エラー:', error);
      alert('分割計算中にエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  };

  const resetCalculation = () => {
    setFamilyStructure({
      spouse_exists: false,
      children_count: 0,
      adopted_children_count: 0,
      grandchild_adopted_count: 0,
      parents_alive: 0,
      siblings_count: 0,
      half_siblings_count: 0,
      non_heirs_count: 0
    });
    setTaxableAmount(0);
    setLegalHeirs([]);
    setTaxCalculationResult(null);
    setActualDivisionResult(null);
    setCurrentStep('family');
    setFormInputData(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="container mx-auto px-4 py-8">
        {/* ヘッダー */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="bg-blue-600 p-3 rounded-full mr-4">
              <Calculator className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-4xl font-bold text-gray-900 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              相続税計算アプリ
            </h1>
          </div>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto leading-relaxed">
            法定相続人の判定から相続税の計算、2割加算・配偶者税額軽減の適用まで、<br />
            正確で簡単な相続税計算をサポートします。
          </p>
          <div className="mt-4 text-sm text-gray-500">
            2025年最新版 | 国税庁基準準拠
          </div>
        </div>

        {/* メインコンテンツ */}
        <div className="max-w-6xl mx-auto">
          <Tabs value={currentStep} onValueChange={setCurrentStep} className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8 bg-white shadow-sm">
              <TabsTrigger 
                value="family" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700"
              >
                <Users className="h-4 w-4" />
                家族構成入力
              </TabsTrigger>
              <TabsTrigger 
                value="result" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700" 
                disabled={!taxCalculationResult}
              >
                <FileText className="h-4 w-4" />
                計算結果
              </TabsTrigger>
              <TabsTrigger 
                value="division" 
                className="flex items-center gap-2 data-[state=active]:bg-blue-50 data-[state=active]:text-blue-700" 
                disabled={!taxCalculationResult}
              >
                <PieChart className="h-4 w-4" />
                実際の分割
              </TabsTrigger>
            </TabsList>

            <TabsContent value="family" className="space-y-6">
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-t-lg">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <Users className="h-5 w-5" />
                    家族構成と課税価格の入力
                  </CardTitle>
                  <CardDescription className="text-blue-700">
                    被相続人の家族構成と課税価格の合計額を入力してください。
                    法定相続人の判定と基礎控除の計算を行います。
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-6">
                  <FamilyStructureForm 
                    onSubmit={handleFamilyStructureSubmit} 
                    initialData={formInputData}
                    isLoading={isLoading}
                  />
                  {formInputData && (
                    <div className="flex justify-center mt-6">
                      <Button 
                        onClick={resetCalculation} 
                        variant="outline" 
                        className="flex items-center gap-2 hover:bg-blue-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        新しい計算を開始
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="result" className="space-y-6">
              {taxCalculationResult && (
                <>
                  <TaxCalculationResult 
                    result={taxCalculationResult}
                    taxableAmount={taxableAmount}
                  />
                  <div className="flex justify-center gap-4">
                    <Button 
                      onClick={resetCalculation} 
                      variant="outline"
                      className="hover:bg-blue-50"
                    >
                      新しい計算を開始
                    </Button>
                    <Button 
                      onClick={() => setCurrentStep('division')}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      実際の分割を計算
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>

            <TabsContent value="division" className="space-y-6">
              {taxCalculationResult && (
                <>
                  <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-t-lg">
                      <CardTitle className="flex items-center gap-2 text-purple-900">
                        <PieChart className="h-5 w-5" />
                        実際の遺産分割
                      </CardTitle>
                      <CardDescription className="text-purple-700">
                        法定相続分とは異なる実際の遺産分割がある場合の税額配分を計算します。
                        金額指定または割合指定を選択できます。
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="p-6">
                      <ActualDivisionForm 
                        heirs={legalHeirs}
                        totalAmount={taxableAmount}
                        totalTaxAmount={taxCalculationResult.total_tax_amount}
                        _familyStructure={familyStructure}
                        onSubmit={handleActualDivisionSubmit}
                        result={actualDivisionResult}
                        isLoading={isLoading}
                      />
                    </CardContent>
                  </Card>
                  <div className="flex justify-center">
                    <Button 
                      onClick={resetCalculation} 
                      variant="outline"
                      className="hover:bg-blue-50"
                    >
                      新しい計算を開始
                    </Button>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* フッター */}
        <footer className="mt-16 text-center text-gray-500 space-y-2">
          <p className="text-sm">
            ※ この計算結果は参考値です。実際の税務申告においては税理士等の専門家にご相談ください。
          </p>
          <p className="text-xs">
            相続税計算アプリ v2.0.0 | 2025年6月30日版 | Next.js 15 + TypeScript
          </p>
        </footer>
      </div>
    </div>
  );
}

