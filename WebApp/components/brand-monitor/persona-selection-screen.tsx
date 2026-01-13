import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Persona } from '@/lib/types';
import { Plus, Trash2, ArrowRight, ArrowLeft, User, Sparkles, Target, AlertCircle } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface PersonaSelectionScreenProps {
  personas: Persona[];
  onAddPersona: (persona: Persona) => void;
  onRemovePersona: (id: string) => void;
  onContinue: () => void;
  onBack: () => void;
  isLoading: boolean;
}

export function PersonaSelectionScreen({
  personas,
  onAddPersona,
  onRemovePersona,
  onContinue,
  onBack,
  isLoading
}: PersonaSelectionScreenProps) {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPersona, setNewPersona] = useState<Partial<Persona>>({
    role: '',
    description: '',
    painPoints: [''],
    goals: ['']
  });

  const handleAdd = () => {
    if (newPersona.role && newPersona.description) {
      onAddPersona({
        id: `custom-${Date.now()}`,
        role: newPersona.role,
        description: newPersona.description,
        painPoints: newPersona.painPoints?.filter(p => p) || [],
        goals: newPersona.goals?.filter(g => g) || [],
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(newPersona.role)}`
      } as Persona);
      setShowAddModal(false);
      setNewPersona({ role: '', description: '', painPoints: [''], goals: [''] });
    }
  };

  return (
    <div className="flex flex-col h-full animate-panel-in">
      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 bg-white/80 backdrop-blur-xl z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <button 
                onClick={onBack}
                className="p-2 -ml-2 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold uppercase tracking-wider">
                Step 2 of 3
              </div>
            </div>
            <h1 className="text-2xl font-bold text-slate-900">Target Personas</h1>
            <p className="text-slate-500">
              Review and customize the user personas that will drive your brand analysis.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <Button variant="outline" onClick={() => setShowAddModal(true)} className="gap-2">
              <Plus className="w-4 h-4" />
              Add Persona
            </Button>
            <Button onClick={onContinue} disabled={isLoading || personas.length === 0} className="bg-[#155DFC] hover:bg-[#0e4add] text-white gap-2">
              {isLoading ? 'Generating Prompts...' : 'Continue to Prompts'}
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-8 bg-slate-50/50">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-7xl mx-auto">
          {personas.map((persona) => (
            <Card key={persona.id} className="group relative overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition-all duration-300">
              <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 to-indigo-500" />
              
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shadow-inner">
                      <img 
                        src={persona.avatar} 
                        alt={persona.role} 
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${persona.role}`;
                        }}
                      />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-slate-800">{persona.role}</CardTitle>
                      <Badge variant="secondary" className="mt-1 bg-slate-100 text-slate-600 font-normal">
                        Target Audience
                      </Badge>
                    </div>
                  </div>
                  <button 
                    onClick={() => onRemovePersona(persona.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-sm text-slate-600 leading-relaxed">
                  {persona.description}
                </p>
                
                <div className="space-y-3 pt-2">
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Pain Points
                    </h4>
                    <ul className="space-y-1">
                      {persona.painPoints.slice(0, 3).map((point, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-red-400 mt-1.5 shrink-0" />
                          {point}
                        </li>
                      ))}
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Goals
                    </h4>
                    <ul className="space-y-1">
                      {persona.goals.slice(0, 3).map((goal, i) => (
                        <li key={i} className="text-xs text-slate-600 flex items-start gap-2">
                          <span className="w-1 h-1 rounded-full bg-green-400 mt-1.5 shrink-0" />
                          {goal}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          
          {/* Add New Card Button (Inline) */}
          <button
            onClick={() => setShowAddModal(true)}
            className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
          >
            <div className="w-16 h-16 rounded-full bg-white border border-slate-200 shadow-sm flex items-center justify-center group-hover:scale-110 transition-transform mb-4">
              <Plus className="w-8 h-8 text-slate-300 group-hover:text-blue-500" />
            </div>
            <h3 className="text-lg font-semibold text-slate-600 group-hover:text-blue-600">Create Custom Persona</h3>
            <p className="text-sm text-slate-400 mt-1">Define a specific user segment</p>
          </button>
        </div>
      </div>

      {/* Add Persona Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Custom Persona</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Role Name</Label>
              <Input 
                placeholder="e.g. The Budget Traveler" 
                value={newPersona.role}
                onChange={(e) => setNewPersona({...newPersona, role: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                placeholder="Briefly describe this persona's context and needs..." 
                value={newPersona.description}
                onChange={(e) => setNewPersona({...newPersona, description: e.target.value})}
              />
            </div>
            <div className="space-y-2">
                <Label>Key Pain Point (Optional)</Label>
                <Input 
                    placeholder="What is their main frustration?"
                    value={newPersona.painPoints?.[0] || ''}
                    onChange={(e) => setNewPersona({...newPersona, painPoints: [e.target.value]})}
                />
            </div>
            <div className="space-y-2">
                <Label>Primary Goal (Optional)</Label>
                <Input 
                    placeholder="What are they trying to achieve?"
                    value={newPersona.goals?.[0] || ''}
                    onChange={(e) => setNewPersona({...newPersona, goals: [e.target.value]})}
                />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!newPersona.role || !newPersona.description}>Add Persona</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
