'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, FileText, ScrollText, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const TEMPLATE_TYPES = [
  {
    type: 'email',
    value: 1,
    label: 'Email',
    description: 'Modèles d\'e-mails responsive avec MJML',
    icon: Mail,
    color: 'bg-blue-50 text-blue-600 border-blue-200',
    activeColor: 'bg-blue-100 border-blue-500 ring-2 ring-blue-500',
  },
  {
    type: 'facture',
    value: 2,
    label: 'Facture',
    description: 'Modèles de factures en PDF',
    icon: FileText,
    color: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    activeColor: 'bg-emerald-100 border-emerald-500 ring-2 ring-emerald-500',
  },
  {
    type: 'contrat',
    value: 3,
    label: 'Contrat',
    description: 'Modèles de contrats en PDF',
    icon: ScrollText,
    color: 'bg-amber-50 text-amber-600 border-amber-200',
    activeColor: 'bg-amber-100 border-amber-500 ring-2 ring-amber-500',
  },
];

export default function NewTemplatePage() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<number | null>(null);
  const [templateName, setTemplateName] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('');

  const handleContinue = () => {
    if (!selectedType || !templateName.trim()) return;

    const params = new URLSearchParams({
      name: templateName,
      type: String(selectedType),
      description,
      subject,
    });
    router.push(`/dashboard/templates/editor?${params.toString()}`);
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <h1 className="text-2xl font-bold text-slate-900 mb-1">Créer un modèle</h1>
        <p className="text-slate-500 text-sm mb-8">Choisissez un type et donnez un nom à votre modèle</p>

        {/* Type Selection */}
        <div className="mb-6">
          <Label className="text-sm font-medium mb-3 block">Type de modèle</Label>
          <div className="grid grid-cols-3 gap-3">
            {TEMPLATE_TYPES.map((t) => (
              <button
                key={t.value}
                onClick={() => setSelectedType(t.value)}
                className={`flex flex-col items-center gap-2 p-5 rounded-xl border transition-all ${
                  selectedType === t.value ? t.activeColor : `${t.color} hover:shadow-md`
                }`}
              >
                <t.icon size={28} />
                <span className="text-sm font-semibold">{t.label}</span>
                <span className="text-xs text-slate-500 text-center">{t.description}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Template Name */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-1.5 block">Nom du modèle *</Label>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            placeholder="e.g. Welcome Email, Facture Mars 2026..."
            className="h-10"
          />
        </div>

        {/* Description */}
        <div className="mb-4">
          <Label className="text-sm font-medium mb-1.5 block">Description</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Description optionnelle..."
            className="h-10"
          />
        </div>

        {/* Subject (for email type) */}
        {selectedType === 1 && (
          <div className="mb-4">
            <Label className="text-sm font-medium mb-1.5 block">Objet de l&apos;e-mail</Label>
            <Input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Welcome to {{company}}!"
              className="h-10"
            />
          </div>
        )}

        {/* Continue Button */}
        <div className="flex justify-end mt-8">
          <Button
            onClick={handleContinue}
            disabled={!selectedType || !templateName.trim()}
            className="gap-2"
          >
            Continuer vers l&apos;éditeur
            <ArrowRight size={16} />
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
