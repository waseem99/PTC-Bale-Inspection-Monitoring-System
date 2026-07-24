import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import tseslint from 'typescript-eslint';
const typedConfigs=tseslint.configs.recommendedTypeChecked.map((config)=>({...config,files:['**/*.{ts,tsx}']}));
export default tseslint.config({ignores:['dist','playwright-report','test-results','coverage','public/sw.js']},js.configs.recommended,...typedConfigs,{files:['**/*.{ts,tsx}'],languageOptions:{parserOptions:{projectService:true,tsconfigRootDir:import.meta.dirname}},plugins:{'react-hooks':reactHooks},rules:{...reactHooks.configs.recommended.rules,'@typescript-eslint/no-explicit-any':'error','@typescript-eslint/no-floating-promises':'error','@typescript-eslint/consistent-type-imports':['error',{prefer:'type-imports'}],'@typescript-eslint/no-misused-promises':['error',{checksVoidReturn:{attributes:false}}]}});
