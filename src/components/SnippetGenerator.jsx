import React, { useState, useRef } from 'react';
import { Plus, Minus, Code, Download, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardContent, CardFooter } from '../components/ui/card';
import toast, { Toaster } from 'react-hot-toast';

const SnippetGenerator = () => {
  const [steps, setSteps] = useState({
    trigger: {
      event: {
        body: [{ key: '', value: '' }],
        headers: [{ key: '', value: '' }]
      }
    }
  });
  const [editingStep, setEditingStep] = useState(null);
  const inputRef = useRef(null);

  const addRow = (stepName, section) => {
    setSteps(prevSteps => ({
      ...prevSteps,
      [stepName]: {
        ...prevSteps[stepName],
        event: stepName === 'trigger' 
          ? {
              ...prevSteps[stepName].event,
              [section]: [...prevSteps[stepName].event[section], { key: '', value: '' }]
            }
          : undefined,
        $return_value: stepName !== 'trigger'
          ? [...(prevSteps[stepName].$return_value || []), { key: '', value: '' }]
          : undefined
      }
    }));
  };

  const removeRow = (stepName, section, index) => {
    setSteps(prevSteps => {
      const updatedSteps = { ...prevSteps };
      if (stepName === 'trigger') {
        if (updatedSteps[stepName].event[section].length > 1) {
          updatedSteps[stepName].event[section] = updatedSteps[stepName].event[section].filter((_, i) => i !== index);
        }
      } else {
        if (updatedSteps[stepName].$return_value.length > 1) {
          updatedSteps[stepName].$return_value = updatedSteps[stepName].$return_value.filter((_, i) => i !== index);
        }
      }
      return updatedSteps;
    });
  };

  const updateRow = (stepName, section, index, field, value) => {
    setSteps(prevSteps => ({
      ...prevSteps,
      [stepName]: stepName === 'trigger'
        ? {
            ...prevSteps[stepName],
            event: {
              ...prevSteps[stepName].event,
              [section]: prevSteps[stepName].event[section].map((item, i) => 
                i === index ? { ...item, [field]: value } : item
              )
            }
          }
        : {
            ...prevSteps[stepName],
            $return_value: prevSteps[stepName].$return_value.map((item, i) =>
              i === index ? { ...item, [field]: value } : item
            )
          }
    }));
  };

  const addStep = () => {
    const newStepName = `step_${Object.keys(steps).length}`;
    setSteps(prevSteps => ({
      ...prevSteps,
      [newStepName]: {
        $return_value: [{ key: '', value: '' }]
      }
    }));
  };

  const removeStep = (stepName) => {
    setSteps(prevSteps => {
      const { [stepName]: _, ...rest } = prevSteps;
      return rest;
    });
  };

  const updateStepName = (oldName, newName) => {
    if (oldName === newName) return;
    if (steps[newName]) {
      toast.error('Step name already exists');
      return;
    }
    setSteps(prevSteps => {
      const { [oldName]: step, ...rest } = prevSteps;
      return { ...rest, [newName]: step };
    });
  };

  const generateSnippet = () => {
    const processedSteps = Object.entries(steps).reduce((acc, [stepName, stepData]) => {
      if (stepName === 'trigger') {
        acc[stepName] = {
          event: {
            body: Object.fromEntries(stepData.event.body.filter(item => item.key).map(item => [item.key, item.value])),
            headers: Object.fromEntries(stepData.event.headers.filter(item => item.key).map(item => [item.key, item.value]))
          }
        };
      } else {
        acc[stepName] = {
          $return_value: Object.fromEntries(stepData.$return_value.filter(item => item.key).map(item => [item.key, item.value]))
        };
      }
      return acc;
    }, {});

    const snippet = `
// Import your required npm packages
import axios from 'axios';

async function run(steps) {
  const eventData = steps.trigger.event;
 
  try {
    return eventData;
  } catch (error) {
    console.error('Error fetching data:', error);
    return { error: error.message };
  }
}

(async () => {
  const steps = ${JSON.stringify(processedSteps, null, 2)};
  const result = await run(steps);
  console.log('Result:', result);
})();
    `.trim();

    return snippet;
  };

  const copySnippetToClipboard = () => {
    navigator.clipboard.writeText(generatedSnippet).then(() => {
      toast.success('Snippet copied to clipboard!', {
        duration: 2000,
        position: 'bottom-center',
      });
    }).catch(() => {
      toast.error('Failed to copy snippet. Please try again.');
    });
  };

  const downloadSnippet = () => {
    const element = document.createElement('a');
    const file = new Blob([generatedSnippet], {type: 'text/javascript'});
    element.href = URL.createObjectURL(file);
    element.download = 'snippet.js';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    toast.success('Snippet downloaded!', {
      duration: 2000,
      position: 'bottom-center',
    });
  };

  const [generatedSnippet, setGeneratedSnippet] = useState('');

  const startEditing = (stepName) => {
    setEditingStep(stepName);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const finishEditing = (oldName, newName) => {
    setEditingStep(null);
    if (oldName === newName) return;
    if (steps[newName]) {
      toast.error('Step name already exists');
      return;
    }
    setSteps(prevSteps => {
      const { [oldName]: step, ...rest } = prevSteps;
      return { ...rest, [newName]: step };
    });
  };

  const handleSnippetChange = (e) => {
    setGeneratedSnippet(e.target.value);
  };

  const convertSnippet = () => {
    try {
      // Extract imports
      const importRegex = /^import.*?;$/gm;
      const imports = generatedSnippet.match(importRegex) || [];
      
      // Extract the entire run function
      const runFunctionRegex = /async function run\(steps\)\s*{([\s\S]*?)^}/m;
      const runFunctionMatch = generatedSnippet.match(runFunctionRegex);
      
      if (!runFunctionMatch) {
        throw new Error("Couldn't find the run function in the snippet.");
      }
      
      const functionBody = runFunctionMatch[1].trim();

      // Construct the new snippet
      const convertedSnippet = `
${imports.join('\n')}

export default defineComponent({
  async run({ steps, $ }) {
${functionBody}
  },
})
      `.trim();

      setGeneratedSnippet(convertedSnippet);
      toast.success('Snippet converted successfully!');
    } catch (error) {
      toast.error(`Conversion failed: ${error.message}`);
    }
  };

  const renderRows = (stepName, section) => {
    const rows = stepName === 'trigger'
      ? steps[stepName].event[section]
      : steps[stepName].$return_value;
    
    if (rows.length === 0) {
      return (
        <div className="flex justify-center my-4">
          <Button
            onClick={() => addRow(stepName, section)}
            className="bg-green-500 hover:bg-green-600 text-white border-none transition-colors duration-200 ease-in-out"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
        </div>
      );
    }
    
    return rows.map((row, index) => (
      <div key={index} className="flex items-center mb-2">
        <Input
          className="mr-2 flex-grow"
          value={row.key}
          onChange={(e) => updateRow(stepName, stepName === 'trigger' ? section : '$return_value', index, 'key', e.target.value)}
          placeholder="Key"
        />
        <Input
          className="mr-2 flex-grow"
          value={row.value}
          onChange={(e) => updateRow(stepName, stepName === 'trigger' ? section : '$return_value', index, 'value', e.target.value)}
          placeholder="Value"
        />
        <div className="relative group">
          <Button
            variant="outline"
            size="icon"
            onClick={() => addRow(stepName, section)}
            className="mr-1 w-10 h-8 rounded-md bg-green-500 hover:bg-green-600 text-white border-none transition-colors duration-200 ease-in-out"
          >
            <Plus className="h-4 w-4" />
          </Button>
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out whitespace-nowrap">
            Add new row
          </span>
        </div>
        <div className="relative group">
          <Button
            variant="outline"
            size="icon"
            onClick={() => removeRow(stepName, section, index)}
            className="w-10 h-8 rounded-md bg-red-500 hover:bg-red-600 text-white border-none transition-colors duration-200 ease-in-out"
          >
            <Minus className="h-4 w-4" />
          </Button>
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-in-out whitespace-nowrap">
            Remove row
          </span>
        </div>
      </div>
    ));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto bg-white text-black">
      <Toaster />
      <h1 className="text-3xl font-bold mb-6">Pipedream Snippet Generator</h1>
      
      {Object.entries(steps).map(([stepName, stepData]) => (
        <Card key={stepName} className="mb-6">
          <CardHeader className="bg-gray-100 flex flex-row items-center">
            {stepName === 'trigger' ? (
              <h2 className="text-xl font-semibold">Trigger</h2>
            ) : editingStep === stepName ? (
              <Input
                ref={inputRef}
                className="text-xl font-semibold bg-transparent border-none"
                defaultValue={stepName}
                onBlur={(e) => finishEditing(stepName, e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && finishEditing(stepName, e.target.value)}
              />
            ) : (
              <h2 
                className="text-xl font-semibold cursor-pointer" 
                onClick={() => startEditing(stepName)}
              >
                {stepName}
              </h2>
            )}
          </CardHeader>
          <CardContent>
            {stepName === 'trigger' ? (
              <>
                <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-md">
                  <h3 className="text-lg font-medium mb-2 text-blue-700">Event Body</h3>
                  {renderRows('trigger', 'body')}
                </div>

                <div className="p-4 bg-purple-50 border border-purple-200 rounded-md">
                  <h3 className="text-lg font-medium mb-2 text-purple-700">Event Headers</h3>
                  {renderRows('trigger', 'headers')}
                </div>
              </>
            ) : (
              <>
                <h3 className="text-lg font-medium mb-2">Return Value</h3>
                {renderRows(stepName, '$return_value')}
              </>
            )}
          </CardContent>
          {stepName !== 'trigger' && (
            <CardFooter>
              <Button 
                onClick={() => removeStep(stepName)}
                className="bg-red-500 hover:bg-red-600 text-white border-none transition-colors duration-200 ease-in-out"
              >
                <Minus className="h-4 w-4 mr-2" />
                Remove Step
              </Button>
            </CardFooter>
          )}
        </Card>
      ))}
      
      <Button 
        onClick={addStep} 
        className="mb-6 bg-green-500 hover:bg-green-600 text-white border-none transition-colors duration-200 ease-in-out"
      >
        <Plus className="h-4 w-4 mr-2" />
        Add Step
      </Button>
      
      <Button 
        onClick={() => setGeneratedSnippet(generateSnippet())} 
        className="mb-6 ml-2 bg-purple-500 hover:bg-purple-600 text-white border-none transition-colors duration-200 ease-in-out"
      >
        <Code className="h-4 w-4 mr-2" />
        Generate Snippet
      </Button>
      
      {generatedSnippet && (
        <Card>
          <CardHeader>
            <h2 className="text-xl font-semibold">Generated Snippet</h2>
          </CardHeader>
          <CardContent>
            <textarea
              className="w-full h-64 p-4 bg-gray-100 rounded-md font-mono text-sm"
              value={generatedSnippet}
              onChange={handleSnippetChange}
            />
          </CardContent>
          <CardFooter>
            <Button 
              onClick={copySnippetToClipboard} 
              className="mr-2 bg-blue-500 hover:bg-blue-600 text-white border-none transition-colors duration-200 ease-in-out"
            >
              <Code className="h-4 w-4 mr-2" />
              Copy Snippet
            </Button>
            <Button 
              onClick={convertSnippet}
              className="mr-2 bg-purple-500 hover:bg-purple-600 text-white border-none transition-colors duration-200 ease-in-out"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Convert
            </Button>
            <Button 
              onClick={downloadSnippet}
              className="bg-green-500 hover:bg-green-600 text-white border-none transition-colors duration-200 ease-in-out"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Snippet
            </Button>
          </CardFooter>
        </Card>
      )}
    </div>
  );
};

export default SnippetGenerator;