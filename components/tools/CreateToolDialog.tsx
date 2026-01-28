'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Check, Code, Link, Database, Webhook, Plus, Trash2 } from 'lucide-react';
import { CodeEditor, CodePreview } from './CodeEditor';

// ============================================================
// TYPES
// ============================================================

interface ToolParameter {
  name: string;
  type: 'string' | 'number' | 'boolean' | 'object' | 'array';
  description: string;
  required: boolean;
  default?: any;
}

interface CreateToolDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ============================================================
// CREATE TOOL DIALOG
// ============================================================

export function CreateToolDialog({ isOpen, onClose, onSuccess }: CreateToolDialogProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [toolType, setToolType] = useState<'api_call' | 'code_execution' | 'database_query' | 'webhook'>('api_call');
  const [name, setName] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [parameters, setParameters] = useState<ToolParameter[]>([]);
  const [code, setCode] = useState(`// Write your JavaScript code here
// Available parameters will be in the 'params' object
// Return the result at the end

function execute(params) {
  // Your code here

  return {
    message: "Hello from custom tool!",
    params: params
  };
}

execute(params);`);

  // Tool types
  const toolTypes = [
    {
      type: 'api_call' as const,
      icon: Link,
      name: 'API Call',
      description: 'Connect to external REST/GraphQL APIs',
      color: 'blue',
    },
    {
      type: 'code_execution' as const,
      icon: Code,
      name: 'Code Execution',
      description: 'Run custom JavaScript code',
      color: 'purple',
    },
    {
      type: 'database_query' as const,
      icon: Database,
      name: 'Database Query',
      description: 'Query databases (PostgreSQL, MySQL, etc.)',
      color: 'green',
    },
    {
      type: 'webhook' as const,
      icon: Webhook,
      name: 'Webhook',
      description: 'Trigger webhooks on events',
      color: 'orange',
    },
  ];

  // Add parameter
  const addParameter = () => {
    setParameters([
      ...parameters,
      {
        name: '',
        type: 'string',
        description: '',
        required: false,
      },
    ]);
  };

  // Remove parameter
  const removeParameter = (index: number) => {
    setParameters(parameters.filter((_, i) => i !== index));
  };

  // Update parameter
  const updateParameter = (index: number, field: keyof ToolParameter, value: any) => {
    const updated = [...parameters];
    updated[index] = { ...updated[index], [field]: value };
    setParameters(updated);
  };

  // Submit tool
  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Basic validation
      if (!name || !displayName) {
        throw new Error('Name and display name are required');
      }

      // Create tool payload
      const config: any = {};

      // Add code for code_execution tools
      if (toolType === 'code_execution') {
        config.code = code;
        config.runtime = 'nodejs';
      }

      const payload = {
        name: name.toLowerCase().replace(/\s+/g, '_'),
        displayName,
        description,
        category,
        type: toolType,
        config,
        parameters,
      };

      const response = await fetch('/api/custom-tools', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create tool');
      }

      onSuccess();
      onClose();
      resetForm();
    } catch (error: any) {
      console.error('Failed to create tool:', error);
      alert(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Reset form
  const resetForm = () => {
    setCurrentStep(1);
    setToolType('api_call');
    setName('');
    setDisplayName('');
    setDescription('');
    setCategory('custom');
    setParameters([]);
    setCode(`// Write your JavaScript code here
// Available parameters will be in the 'params' object
// Return the result at the end

function execute(params) {
  // Your code here

  return {
    message: "Hello from custom tool!",
    params: params
  };
}

execute(params);`);
  };

  // Can go to next step
  const canGoNext = () => {
    if (currentStep === 1) return toolType !== null;
    if (currentStep === 2) return name && displayName;
    if (currentStep === 3) return true;
    return false;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        className="bg-gray-800 border border-gray-700 rounded-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">Create Custom Tool</h2>
            <p className="text-muted-foreground text-sm mt-1">
              Step {currentStep} of 4
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        {/* Progress */}
        <div className="px-6 py-4 border-b border-gray-700">
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`flex-1 h-2 rounded-full transition-colors ${
                  step <= currentStep ? 'bg-blue-600' : 'bg-gray-700'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <AnimatePresence mode="wait">
            {/* Step 1: Choose Type */}
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  Choose Tool Type
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {toolTypes.map((type) => {
                    const Icon = type.icon;
                    const isSelected = toolType === type.type;

                    return (
                      <button
                        key={type.type}
                        onClick={() => setToolType(type.type)}
                        className={`p-6 rounded-lg border-2 transition-all text-left ${
                          isSelected
                            ? 'border-blue-500 bg-blue-500/10'
                            : 'border-gray-700 hover:border-gray-600 bg-gray-800/50'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div
                            className={`p-3 rounded-lg ${
                              type.color === 'blue' ? 'bg-blue-500/10' :
                              type.color === 'purple' ? 'bg-purple-500/10' :
                              type.color === 'green' ? 'bg-green-500/10' :
                              'bg-orange-500/10'
                            }`}
                          >
                            <Icon
                              className={`w-6 h-6 ${
                                type.color === 'blue' ? 'text-blue-400' :
                                type.color === 'purple' ? 'text-purple-400' :
                                type.color === 'green' ? 'text-green-400' :
                                'text-orange-400'
                              }`}
                            />
                          </div>
                          <div className="flex-1">
                            <h4 className="text-white font-semibold mb-1">
                              {type.name}
                            </h4>
                            <p className="text-muted-foreground text-sm">
                              {type.description}
                            </p>
                          </div>
                          {isSelected && (
                            <Check className="w-5 h-5 text-blue-400" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </motion.div>
            )}

            {/* Step 2: Basic Info */}
            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  Basic Information
                </h3>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Display Name *
                  </label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => {
                      setDisplayName(e.target.value);
                      if (!name) {
                        setName(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                      }
                    }}
                    placeholder="My Custom Tool"
                    className="w-full px-4 py-2 bg-card border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Internal Name *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                    placeholder="my_custom_tool"
                    className="w-full px-4 py-2 bg-card border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 font-mono"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lowercase with underscores only
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does this tool do?"
                    rows={3}
                    className="w-full px-4 py-2 bg-card border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 resize-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    placeholder="custom"
                    className="w-full px-4 py-2 bg-card border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </motion.div>
            )}

            {/* Step 3: Code Editor (for code_execution) or Parameters */}
            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                {/* Code Editor (only for code_execution tools) */}
                {toolType === 'code_execution' && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white mb-2">
                        Code Editor
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Write your JavaScript code. Parameters will be available in the <code className="text-purple-400 bg-purple-500/10 px-2 py-1 rounded">params</code> object.
                      </p>
                    </div>

                    <CodeEditor
                      value={code}
                      onChange={setCode}
                      language="javascript"
                      height="350px"
                    />

                    <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                      <h4 className="text-sm font-semibold text-purple-400 mb-2">💡 Tips:</h4>
                      <ul className="text-xs text-muted-foreground space-y-1">
                        <li>• Use <code className="text-purple-400">params.parameterName</code> to access parameters</li>
                        <li>• Return an object or value at the end</li>
                        <li>• Use <code className="text-purple-400">console.log()</code> for debugging (visible in test console)</li>
                        <li>• Avoid infinite loops or long-running operations</li>
                      </ul>
                    </div>
                  </div>
                )}

                {/* Parameters Section */}
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-white">
                    Parameters {toolType === 'code_execution' && <span className="text-sm text-muted-foreground font-normal">(Optional)</span>}
                  </h3>
                  <button
                    onClick={addParameter}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Parameter
                  </button>
                </div>

                {parameters.length === 0 ? (
                  <div className="text-center py-12 border-2 border-dashed border-gray-700 rounded-lg">
                    <p className="text-muted-foreground mb-4">No parameters defined yet</p>
                    <button
                      onClick={addParameter}
                      className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
                    >
                      Add First Parameter
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {parameters.map((param, index) => (
                      <div
                        key={index}
                        className="p-4 bg-card border border-gray-700 rounded-lg"
                      >
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Name
                            </label>
                            <input
                              type="text"
                              value={param.name}
                              onChange={(e) => updateParameter(index, 'name', e.target.value)}
                              placeholder="paramName"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm font-mono focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Type
                            </label>
                            <select
                              value={param.type}
                              onChange={(e) => updateParameter(index, 'type', e.target.value)}
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                            >
                              <option value="string">String</option>
                              <option value="number">Number</option>
                              <option value="boolean">Boolean</option>
                              <option value="object">Object</option>
                              <option value="array">Array</option>
                            </select>
                          </div>

                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-muted-foreground mb-1">
                              Description
                            </label>
                            <input
                              type="text"
                              value={param.description}
                              onChange={(e) => updateParameter(index, 'description', e.target.value)}
                              placeholder="Parameter description"
                              className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>

                          <div className="flex items-center justify-between md:col-span-2">
                            <label className="flex items-center gap-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={param.required}
                                onChange={(e) => updateParameter(index, 'required', e.target.checked)}
                                className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-700 rounded focus:ring-blue-500"
                              />
                              <span className="text-sm text-gray-300">Required</span>
                            </label>

                            <button
                              onClick={() => removeParameter(index)}
                              className="p-2 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Step 4: Review */}
            {currentStep === 4 && (
              <motion.div
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-6"
              >
                <h3 className="text-lg font-semibold text-white mb-4">
                  Review & Create
                </h3>

                <div className="space-y-4">
                  <div className="p-4 bg-card border border-gray-700 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Type</div>
                    <div className="text-white font-medium capitalize">
                      {toolType.replace('_', ' ')}
                    </div>
                  </div>

                  <div className="p-4 bg-card border border-gray-700 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-1">Name</div>
                    <div className="text-white font-medium">{displayName}</div>
                    <div className="text-sm text-muted-foreground font-mono">{name}</div>
                  </div>

                  {description && (
                    <div className="p-4 bg-card border border-gray-700 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Description</div>
                      <div className="text-white">{description}</div>
                    </div>
                  )}

                  {/* Code Preview for code_execution tools */}
                  {toolType === 'code_execution' && (
                    <div className="p-4 bg-card border border-gray-700 rounded-lg">
                      <div className="text-sm text-muted-foreground mb-3">Code</div>
                      <CodePreview
                        code={code}
                        language="javascript"
                        height="250px"
                        showLineNumbers={true}
                      />
                    </div>
                  )}

                  <div className="p-4 bg-card border border-gray-700 rounded-lg">
                    <div className="text-sm text-muted-foreground mb-2">Parameters</div>
                    {parameters.length === 0 ? (
                      <div className="text-muted-foreground text-sm">No parameters</div>
                    ) : (
                      <div className="space-y-2">
                        {parameters.map((param, index) => (
                          <div key={index} className="flex items-center gap-2 text-sm">
                            <code className="text-blue-400">{param.name}</code>
                            <span className="text-muted-foreground">:</span>
                            <span className="text-purple-400">{param.type}</span>
                            {param.required && (
                              <span className="text-red-400">*</span>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-700">
          <button
            onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
            disabled={currentStep === 1}
            className="flex items-center gap-2 px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeft className="w-4 h-4" />
            Back
          </button>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="px-6 py-2 text-muted-foreground hover:text-white transition-colors"
            >
              Cancel
            </button>

            {currentStep < 4 ? (
              <button
                onClick={() => setCurrentStep(currentStep + 1)}
                disabled={!canGoNext()}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Creating...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Create Tool
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
