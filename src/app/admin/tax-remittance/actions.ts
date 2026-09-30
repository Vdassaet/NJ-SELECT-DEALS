'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

export async function recordTaxPayment(formData: FormData) {
  const taxPeriod = formData.get('taxPeriod') as string;
  const amountPaid = parseFloat(formData.get('amountPaid') as string);
  const paymentDate = formData.get('paymentDate') as string;
  const agency = formData.get('agency') as string;
  const confirmationNumber = formData.get('confirmationNumber') as string;
  const paymentMethod = formData.get('paymentMethod') as string;
  const notes = formData.get('notes') as string;

  if (!taxPeriod || isNaN(amountPaid) || !paymentDate || !agency) {
    throw new Error('Missing required fields');
  }

  await prisma.taxRemittance.create({
    data: {
      taxPeriod,
      amountPaid,
      paymentDate: new Date(paymentDate),
      agency,
      confirmationNumber: confirmationNumber || null,
      paymentMethod: paymentMethod || null,
      notes: notes || null,
    },
  });

  revalidatePath('/admin/tax-remittance');
}
