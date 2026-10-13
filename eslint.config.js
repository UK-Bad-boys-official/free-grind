import globals from "globals";
import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import ts from "typescript-eslint";
import prettier from "eslint-config-prettier";

export default defineConfig(
	js.configs.recommended,
	ts.configs.recommended,
	prettier,
	{
		languageOptions: { globals: globals.node },
		rules: {
			"no-undef": "off",
			// Underscore-prefixed names are this codebase's way of marking a
			// binding as intentionally unused (destructuring to omit a field,
			// unused callback parameters, ...).
			"@typescript-eslint/no-unused-vars": [
				"error",
				{
					argsIgnorePattern: "^_",
					varsIgnorePattern: "^_",
					caughtErrorsIgnorePattern: "^_",
					destructuredArrayIgnorePattern: "^_",
				},
			],
		},
	},
);
