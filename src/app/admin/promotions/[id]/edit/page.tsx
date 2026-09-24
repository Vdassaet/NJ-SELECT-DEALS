'use client';

import React, { useEffect, useState } from 'react';
import { PromotionForm } from '@/components/admin/PromotionForm';
import { RotateCw, AlertCircle } from 'lucide-react';

export default function AdminEditPromotionPage({ params }: { params: { id: string } }) {
  const [promotion, setPromotion] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadPromotion() {
      try {
        const res = await fetch(`/api/promotions/${params.id}`);
        if (res.ok) {
          const data = await res.json();
          setPromotion(data.promotion);
        } else {
          setError('Promotion not found.');
        }
      } catch (err) {
        setError('Failed to load promotion data.');
      } finally {
        setIsLoading(false);
      }
    }
    loadPromotion();
  }, [params.id]);

  if (isLoading) {
    return (
      <div className="py-20 text-center text-slate-400">
        <RotateCw className="w-8 h-8 animate-spin mx-auto mb-3 text-amber-500" />
        <p className="text-xs font-semibold">Loading promotion details...</p>
      </div>
    );
  }

  if (error || !promotion) {
    return (
      <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 max-w-md mx-auto space-y-3">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-base font-black text-slate-900">{error || 'Promotion Not Found'}</h2>
      </div>
    );
  }

  return <PromotionForm initialData={promotion} isEdit={true} />;
}
