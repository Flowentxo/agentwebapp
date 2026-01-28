'use client';

/**
 * CREATE TOOL DIALOG
 *
 * Dialog for creating and editing custom JavaScript tools
 */

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Plus, Trash2, Play, AlertCircle, CheckCircle, Code } from 'lucide-react';
import { CustomTool, ToolParameter, ToolTestCase } from '@/lib/studio/types';
import { validateToolCode, executeCustomTool } from '@/lib/studio/tool-executor';
import { getToolRegistry } from '@/lib/studio/tool-registry';

interface CreateToolDialogProps {
  tool?: CustomTool; // For editing existing tool
  onClose: () => void;
  onSave?: (tool: CustomTool) => void;
}

export function CreateToolDialog({ tool, onClose, onSave }: CreateToolDialogProps) {
  const isEditMode = !!tool;

  // Form state
  const [formData, setFormData] = useState({
    name: tool?.name || '',
    description: tool?.description || '',
    category: tool?.category || 'utility',
    author: tool?.author || 'Anonymous',
    version: tool?.version || '1.0.0',
    tags: tool?.tags?.join(', ') || '',
    timeout: tool?.timeout || 5000,
    code: tool?.code || `function execute(params) {
  // Your tool implementation here
  // Access parameters via params object

  // Example:
  // const { input } = params;
  // return input.toUpperCase();

  return {};
}`
  });

  const [parameters, setParameters] = useState<ToolParameter[]>(tool?.parameters || []);
  const [testCases, setTestCases] = useState<ToolTestCase[]>(tool?.testCases || []);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [testResults, setTestResults] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Validate code on change
  const handleCodeChange = useCallback((code: string) => {
    setFormData(prev => ({ ...prev, code }));
    const validation = validateToolCode(code);
    setValidationErrors(validation.errors);
  }, []);

  // Add parameter
  const handleAddParameter = useCallback(() => {
    setParameters(prev => [
      ...prev,
      {
        name: `param${prev.length + 1}`,
        type: 'string',
        description: '',
        required: false
      }
    ]);
  }, []);

  // Remove parameter
  const handleRemoveParameter = useCallback((index: number) => {
    setParameters(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update parameter
  const handleUpdateParameter = useCallback((index: number, updates: Partial<ToolParameter>) => {
    setParameters(prev => prev.map((param, i) =>
      i === index ? { ...param, ...updates } : param
    ));
  }, []);

  // Add test case
  const handleAddTestCase = useCallback(() => {
    setTestCases(prev => [
      ...prev,
      {
        id: `test-${prev.length + 1}`,
        name: `Test ${prev.length + 1}`,
        input: {},
        expectedOutput: null,
        shouldPass: true
      }
    ]);
  }, []);

  // Remove test case
  const handleRemoveTestCase = useCallback((index: number) => {
    setTestCases(prev => prev.filter((_, i) => i !== index));
  }, []);

  // Update test case
  const handleUpdateTestCase = useCallback((index: number, updates: Partial<ToolTestCase>) => {
    setTestCases(prev => prev.map((tc, i) =>
      i === index ? { ...tc, ...updates } : tc
    ));
  }, []);

  // Run tests
  const handleRunTests = useCallback(async () => {
    if (validationErrors.length > 0) {
      alert('Please fix code validation errors first');
      return;
    }

    setIsTesting(true);
    const results: any[] = [];

    const tempTool: CustomTool = {
      id: tool?.id || `temp-${Date.now()}`,
      name: formData.name,
      description: formData.description,
      parameters,
      code: formData.code,
      runtime: 'javascript',
      timeout: formData.timeout,
      author: formData.author,
      version: formData.version,
      tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
      category: formData.category as any,
      verified: false,
      public: false,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    for (const testCase of testCases) {
      const result = await executeCustomTool(tempTool, testCase.input);

      const testPassed = result.success &&
        (testCase.shouldPass
          ? JSON.stringify(result.output) === JSON.stringify(testCase.expectedOutput)
          : !result.success);

      results.push({
        testCase: testCase.name,
        passed: testPassed,
        error: result.error,
        output: result.output,
        expectedOutput: testCase.expectedOutput,
        executionTime: result.executionTime,
        logs: result.logs
      });
    }

    setTestResults({
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results
    });

    setIsTesting(false);
  }, [formData, parameters, testCases, validationErrors, tool]);

  // Save tool
  const handleSave = useCallback(() => {
    // Validate form
    if (!formData.name.trim()) {
      alert('Tool name is required');
      return;
    }

    if (!formData.description.trim()) {
      alert('Tool description is required');
      return;
    }

    if (validationErrors.length > 0) {
      alert('Please fix code validation errors first');
      return;
    }

    setIsSaving(true);

    try {
      const registry = getToolRegistry();

      const newTool: CustomTool = {
        id: tool?.id || `tool-custom-${Date.now()}`,
        name: formData.name,
        description: formData.description,
        parameters,
        code: formData.code,
        runtime: 'javascript',
        timeout: formData.timeout,
        author: formData.author,
        version: formData.version,
        tags: formData.tags.split(',').map(t => t.trim()).filter(t => t),
        category: formData.category as any,
        testCases,
        verified: false,
        public: false,
        createdAt: tool?.createdAt || Date.now(),
        updatedAt: Date.now()
      };

      if (isEditMode) {
        registry.updateTool(tool.id, newTool);
        console.log('✅ Tool updated:', newTool.id);
      } else {
        registry.registerTool(newTool);
        console.log('✅ Tool created:', newTool.id);
      }

      onSave?.(newTool);
      onClose();
    } catch (error: any) {
      alert(`Failed to save tool: ${error.message}`);
    } finally {
      setIsSaving(false);
    }
  }, [formData, parameters, testCases, validationErrors, isEditMode, tool, onSave, onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-surface-1 shadow-2xl"
      >
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/10 bg-surface-1 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-text">
              {isEditMode ? 'Edit Tool' : 'Create Custom Tool'}
            </h2>
            <p className="text-sm text-text-muted">
              {isEditMode ? 'Update your custom JavaScript tool' : 'Build a reusable JavaScript function for your workflows'}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-2 text-text-muted transition hover:bg-card/5"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="grid grid-cols-2 gap-6 p-6">
          {/* Left Column - Metadata */}
          <div className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-text">Basic Information</h3>

              <div>
                <label className="mb-1 block text-xs text-text-muted">Tool Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text placeholder-text-muted focus:border-[rgb(var(--accent))] focus:outline-none"
                  placeholder="e.g., Format Date"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-text-muted">Description *</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text placeholder-text-muted focus:border-[rgb(var(--accent))] focus:outline-none"
                  placeholder="What does this tool do?"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value as 'utility' | 'data' | 'api' | 'transformation' | 'validation' }))}
                    className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text focus:border-[rgb(var(--accent))] focus:outline-none"
                  >
                    <option value="utility">Utility</option>
                    <option value="data">Data</option>
                    <option value="api">API</option>
                    <option value="transformation">Transformation</option>
                    <option value="validation">Validation</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs text-text-muted">Timeout (ms)</label>
                  <input
                    type="number"
                    value={formData.timeout}
                    onChange={(e) => setFormData(prev => ({ ...prev, timeout: parseInt(e.target.value) || 5000 }))}
                    className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text focus:border-[rgb(var(--accent))] focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs text-text-muted">Author</label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData(prev => ({ ...prev, author: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text placeholder-text-muted focus:border-[rgb(var(--accent))] focus:outline-none"
                    placeholder="Your name"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-text-muted">Version</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData(prev => ({ ...prev, version: e.target.value }))}
                    className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text placeholder-text-muted focus:border-[rgb(var(--accent))] focus:outline-none"
                    placeholder="1.0.0"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs text-text-muted">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 text-sm text-text placeholder-text-muted focus:border-[rgb(var(--accent))] focus:outline-none"
                  placeholder="e.g., date, formatting, utility"
                />
              </div>
            </div>

            {/* Parameters */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">Parameters</h3>
                <button
                  onClick={handleAddParameter}
                  className="flex items-center gap-1 rounded-lg bg-[rgb(var(--accent))]/10 px-3 py-1 text-xs text-[rgb(var(--accent))] transition hover:bg-[rgb(var(--accent))]/20"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>

              {parameters.length === 0 && (
                <p className="text-xs text-text-muted italic">No parameters defined</p>
              )}

              {parameters.map((param, index) => (
                <div key={index} className="rounded-lg border border-white/10 bg-surface-0 p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 grid grid-cols-2 gap-2">
                      <input
                        type="text"
                        value={param.name}
                        onChange={(e) => handleUpdateParameter(index, { name: e.target.value })}
                        className="rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text"
                        placeholder="Parameter name"
                      />
                      <select
                        value={param.type}
                        onChange={(e) => handleUpdateParameter(index, { type: e.target.value as any })}
                        className="rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text"
                      >
                        <option value="string">String</option>
                        <option value="number">Number</option>
                        <option value="boolean">Boolean</option>
                        <option value="object">Object</option>
                        <option value="array">Array</option>
                      </select>
                    </div>
                    <button
                      onClick={() => handleRemoveParameter(index)}
                      className="rounded p-1 text-red-400 transition hover:bg-red-400/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <input
                    type="text"
                    value={param.description}
                    onChange={(e) => handleUpdateParameter(index, { description: e.target.value })}
                    className="w-full rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text"
                    placeholder="Description"
                  />
                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-1 text-xs text-text-muted">
                      <input
                        type="checkbox"
                        checked={param.required}
                        onChange={(e) => handleUpdateParameter(index, { required: e.target.checked })}
                        className="rounded border-white/10"
                      />
                      Required
                    </label>
                    {param.type !== 'object' && param.type !== 'array' && (
                      <input
                        type="text"
                        value={param.default || ''}
                        onChange={(e) => handleUpdateParameter(index, { default: e.target.value })}
                        className="flex-1 rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text"
                        placeholder="Default value"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Test Cases */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-text">Test Cases</h3>
                <button
                  onClick={handleAddTestCase}
                  className="flex items-center gap-1 rounded-lg bg-[rgb(var(--accent))]/10 px-3 py-1 text-xs text-[rgb(var(--accent))] transition hover:bg-[rgb(var(--accent))]/20"
                >
                  <Plus className="h-3 w-3" />
                  Add
                </button>
              </div>

              {testCases.map((testCase, index) => (
                <div key={index} className="rounded-lg border border-white/10 bg-surface-0 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      type="text"
                      value={testCase.name}
                      onChange={(e) => handleUpdateTestCase(index, { name: e.target.value })}
                      className="flex-1 rounded border border-white/10 bg-surface-1 px-2 py-1 text-xs text-text"
                      placeholder="Test name"
                    />
                    <button
                      onClick={() => handleRemoveTestCase(index)}
                      className="ml-2 rounded p-1 text-red-400 transition hover:bg-red-400/10"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                  <textarea
                    value={JSON.stringify(testCase.input, null, 2)}
                    onChange={(e) => {
                      try {
                        const input = JSON.parse(e.target.value);
                        handleUpdateTestCase(index, { input });
                      } catch {}
                    }}
                    rows={2}
                    className="w-full rounded border border-white/10 bg-surface-1 px-2 py-1 font-mono text-xs text-text"
                    placeholder='{"param1": "value"}'
                  />
                  <textarea
                    value={testCase.expectedOutput ? JSON.stringify(testCase.expectedOutput, null, 2) : ''}
                    onChange={(e) => {
                      try {
                        const expectedOutput = e.target.value ? JSON.parse(e.target.value) : null;
                        handleUpdateTestCase(index, { expectedOutput });
                      } catch {}
                    }}
                    rows={2}
                    className="w-full rounded border border-white/10 bg-surface-1 px-2 py-1 font-mono text-xs text-text"
                    placeholder="Expected output (JSON)"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Code Editor */}
          <div className="space-y-4">
            {/* Code Editor */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-semibold text-text">JavaScript Code *</label>
                <Code className="h-4 w-4 text-text-muted" />
              </div>
              <textarea
                value={formData.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                rows={20}
                className="w-full rounded-lg border border-white/10 bg-surface-0 px-3 py-2 font-mono text-xs text-text focus:border-[rgb(var(--accent))] focus:outline-none"
                spellCheck={false}
              />
            </div>

            {/* Validation Errors */}
            {validationErrors.length > 0 && (
              <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-400">
                  <AlertCircle className="h-4 w-4" />
                  Validation Errors
                </div>
                <ul className="space-y-1">
                  {validationErrors.map((error, i) => (
                    <li key={i} className="text-xs text-red-400">• {error}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Test Results */}
            {testResults && (
              <div className="rounded-lg border border-white/10 bg-surface-0 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-text">
                    {testResults.failed === 0 ? (
                      <>
                        <CheckCircle className="h-4 w-4 text-green-400" />
                        All Tests Passed
                      </>
                    ) : (
                      <>
                        <AlertCircle className="h-4 w-4 text-red-400" />
                        {testResults.failed} Test(s) Failed
                      </>
                    )}
                  </div>
                  <span className="text-xs text-text-muted">
                    {testResults.passed}/{testResults.passed + testResults.failed}
                  </span>
                </div>
                <div className="space-y-2">
                  {testResults.results.map((result: any, i: number) => (
                    <div
                      key={i}
                      className={`rounded border p-2 ${
                        result.passed
                          ? 'border-green-500/30 bg-green-500/10'
                          : 'border-red-500/30 bg-red-500/10'
                      }`}
                    >
                      <div className="mb-1 flex items-center justify-between text-xs">
                        <span className={result.passed ? 'text-green-400' : 'text-red-400'}>
                          {result.testCase}
                        </span>
                        <span className="text-text-muted">{result.executionTime}ms</span>
                      </div>
                      {result.error && (
                        <p className="text-xs text-red-400">{result.error}</p>
                      )}
                      {result.logs && result.logs.length > 0 && (
                        <div className="mt-1 text-xs text-text-muted">
                          {result.logs.map((log: string, j: number) => (
                            <div key={j}>{log}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between border-t border-white/10 bg-surface-1 px-6 py-4">
          <button
            onClick={handleRunTests}
            disabled={isTesting || testCases.length === 0 || validationErrors.length > 0}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-4 py-2 text-sm text-text transition hover:bg-card/5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play className="h-4 w-4" />
            {isTesting ? 'Running Tests...' : 'Run Tests'}
          </button>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="rounded-lg border border-white/10 px-6 py-2 text-sm text-text transition hover:bg-card/5"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving || validationErrors.length > 0}
              className="rounded-lg bg-[rgb(var(--accent))] px-6 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSaving ? 'Saving...' : isEditMode ? 'Update Tool' : 'Create Tool'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
