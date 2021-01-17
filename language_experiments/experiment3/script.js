// HTML Stuff
let code_area_elem = document.getElementById("code_area1");
document.getElementById("code_area2").style.display = "none";
let which_area = 1;

// Interpreter Data
let program_lines = null;

// Function signatures are stored as strings which hold the ordered argument list
// and the function name.
// e.g. int,string,bool$my_func
// 
// Arguments are represented as objects of the form {var_type: , var_name: }
//
// Statements are objects, and can be in multiple forms...
// All will have a member "kind" which says what kind of statement it is. omitted here.
// - assignment statements: {var_name: , asgn_op: , expression: }
//     * done
// - func invoke statements: {func_sign: , arg_expressions: }
//     * done
// - if/else if/else chain: {cond_expressions: , bodies: }
//     body here meaning a list of statements
// - for statements: {init_stat: , cond_expression: , iter_stat: , body: }
//     body here being a list of statements
// - while statements: {cond_expression: , body: }
// - variable declaration: {var_type: , var_name: , expression: }
//     expression optional
//     * done
// - array declaration: {var_type: , arr_name: , expressions: }
//     expressions for dimension sizes
//     * done
// - return statement: {expression: }
//     expression optional
//     * done
// - array assignment: {arr_name: , ind_expressions: , val_expression: }
//     expression for indices, expression for what value to give



// More of a note to self on tokens, might take different approach.
// Tokens are strings describing a symbol, with no whitespace surrounding.
// Tokens can be a variable name, a function name, ( or ), { or }, [ or ], a literal,
// an operator, a keyword, a comma, a semicolon, a struct-type, a period, a quotation
// mark.

// key is unique function signature
// key yields value which is a function object, object looks like
//       {body: , return_type: , formal_args: }
// - body is a list of strings containing all of the lines in the function, not including
// the beginning and ending brace.
// - return_type is a string, can have the values "void","int","string","double","bool"
// - formal_args is a list of arguments
let scanned_funcs = {};

// key is unique function signature
// key yields value which is a function object, object looks like
//       {body: , return_type: , formal_args: }
// - body is a list of statements
//       a statements can be 
// - return_type is a string, can have the values "void","int","string","double","bool"
// - formal_args is a list of arguments
//
// "Lex" is probably the wrong term here. Perhaps symbolized?
let lexed_funcs = {};

// By "compiled", I mean its been turned into something that can be simulated directly.
// Format not yet decided.
let compiled_funcs = {};



function processCode()
{
	let game_code = code_area_elem.value;
	program_lines = game_code.match(/[^\r\n]+/g);
	// for(let i = 0; i < program_lines.length; i++)
	// 	console.log("Line #" + i + ": \"" + program_lines[i] + "\"");

	let scan_success = scan_for_functions();
	if(!scan_success)
		console.log("Something went wrong with scanning");
	else
		console.log("Scanning went fine\n\n");


	for(let func_sign in scanned_funcs)
	{
		let lex_success = lex_function(func_sign);
		if(!lex_success)
			console.log("Something went wrong with lexing the function " + func_sign);
		else
			console.log("Lexing went fine for function " + func_sign + " \n\n");
	}
	
}

function switchTextArea()
{
	code_area_elem.style.display = "none";
	which_area = 3 - which_area;

	code_area_elem = document.getElementById("code_area" + which_area);
	code_area_elem.style.display = "";
}

function lex_function(func_sign)
{
	// .body, .return_type, .args
	let func_data = scanned_funcs[func_sign];
	lexed_block = lex_block(func_data.body);

	lexed_funcs[func_sign] = {body: lexed_block,
								return_type: func_data.return_type, args: func_data.args};

	return true;
}

// Make sure to parse statements that could contain other statements first.
// e.g. for loops before assignment statements b/c one can find an assignment
// statement in a for loop.
// Actually that might be the only case to watch out for, but yeah.
function lex_block(body)
{
	let statements = [];

	let linenum = 0;
	// console.log("Body length: " + body.length);
	while(linenum < body.length)
	{
		let line = body[linenum];
		line = ignore_comment(line).trim();
		linenum++;

		let asgn_tokens = attempt_parse_assignment(line);
		if(asgn_tokens)
		{
			let asgn_statement = {kind: "asgn", var_name: asgn_tokens[1],
									asgn_op: asgn_tokens[2], expression: asgn_tokens[3]};
			statements.push(asgn_statement);
			continue;
		}

		let return_tokens = attempt_parse_return(line);
		if(return_tokens)
		{
			let return_statement = {kind: "return", expression: return_tokens[1]};
			statements.push(return_statement);
			continue;
		}

		let varinit_tokens = attempt_parse_varinit(line);
		if(varinit_tokens)
		{
			let init_statement = {kind: "declare", var_type: varinit_tokens[1],
									var_name: varinit_tokens[2], expression: varinit_tokens[3]};
			statements.push(init_statement);
			continue;
		}
		
		let vardec_tokens = attempt_parse_vardec(line);
		if(vardec_tokens)
		{
			let dec_statement = {kind: "declare", var_type: vardec_tokens[1],
									var_name: vardec_tokens[2], expression: undefined};
			statements.push(dec_statement);
			continue;
		}

		let invoke_tokens = attempt_parse_funcinvoke(line);
		if(invoke_tokens)
		{
			let invoke_statement = {kind: "invoke", func_name: invoke_tokens[1],
										arg_expressions: invoke_tokens.slice(2)};
			statements.push(invoke_statement);
			continue;
		}

		let arraydec_tokens = attempt_parse_arraydec(line);
		if(arraydec_tokens)
		{
			let arraydec_statement = {kind: "arraydec", var_type: arraydec_tokens[1],
					array_name: arraydec_tokens[2], expressions: arraydec_tokens.slice(3)};
			statements.push(arraydec_statement);
			continue;
		}

		let condchain_info = attempt_parse_condchain(body, linenum);
		if(condchain_info)
		{
			let exprs = condchain_info.expressions;
			let bodies = condchain_info.bodies;
			linenum = condchain_info.nextlinenum;
			
			let lexed_bodies = [];
			for(let i = 0; i < bodies.length; i++)
			{
				let lb = lex_block(bodies[i]);
				if(lb)
					lexed_bodies.push(lb);
				else
					lexed_bodies.push(bodies[i]);
			}

			// One more body than expression if there's an else statement
			let condchain_statement = {kind: "condchain", expressions: exprs,
											bodies: lexed_bodies};
			statements.push(condchain_statement);
		}

		let dunno_statement = {kind: "dunno", body: line};
		statements.push(dunno_statement);
	}

	console.log("Here");

	return statements;
}

// The program will be split up into sections such that there is one where all
// the function definitions reside.
function scan_for_functions(game_code)
{
	let linenum = 0;

	while(linenum < program_lines.length)
	{
		console.log("Processing line " + linenum);
		let line = program_lines[linenum];
		console.log("Contents of line: \"" + line + "\"");
		line = ignore_comment(line);
		console.log("After removing comments: \"" + line + "\"");
		if(line === "")
		{
			linenum++;
			continue;
		}

		let func_tokens = attempt_parse_function(line);
		if(func_tokens)
		{
			let msg = "Function signatured partially parsed, function name: \"" + func_tokens[2] + "\"";
			msg += ", with return type \"" + func_tokens[1] + "\"";
			msg += ", and arglist: \"" + func_tokens[3] + "\"";
			console.log(msg);

			result = attempt_parse_args(func_tokens[3]);
			if(result.isError)
			{
				console.log("Parsing failed at line " + linenum);
				console.log("Line being parsed: \"" + program_lines[linenum] + "\"");
				console.log("Attempted to parse argument list: \"" + func_tokens[2] + "\"");
				console.log(result.errmsg);
				parse_error = true;
				return false;
			}

			arguments = result.args;
			console.log("Successfully parsed function signature");
			console.log("Function name: " + func_tokens[2]);
			console.log("Return type: " + func_tokens[1]);
			console.log("Arguments: ");
			if(arguments.length == 0)
				console.log("*Empty arguments*");

			let var_names = new Set();
			for(let i = 0; i < arguments.length; i++)
			{
				arg = arguments[i];
				console.log("\"" + arg.var_name + "\" of type \"" + arg.var_type + "\"");

				if(var_names.has(arg.var_name))
				{
					console.log("Variable name repeated in formal arguments: \"" + arg.var_name + "\"");
					return false;
				}
				var_names.add(arg.var_name);
			}

			let signature = create_signature_string(arguments,func_tokens[2]);
			let func_start = linenum + 1;
			let func_end = find_closing_brace(program_lines, func_start);

			if(func_end == -1)
			{
				console.log("Something went wrong,");
				console.log("Scanner failed to find starting open brace for function");
				return false;
			}
			else if(func_end == -2)
			{
				console.log("Something went wrong,");
				console.log("Scanner found mismatched same line braces ");
				return false;
			}
			else if(func_end == -3)
			{
				console.log("Something went wrong,");
				console.log("Scanner failed to find ending close brace for function");
				return false;
			}

			let func_body = lines_in_range(program_lines, func_start + 1, func_end - 1);
			// for(let i = func_start + 1; i <= func_end - 1; i++)
			// 	func_body.push(program_lines[i]);

			scanned_funcs[signature] = {body: func_body,
									return_type: func_tokens[1], args: arguments};

			console.log("\n");
			linenum = func_end + 1;
		}
		else if(line.match(/\bfunction\b/))
		{
			console.log("Keyword \"function\" can only be used for function signatures" + linenum);
			return false;
		}
		else
		{
			console.log("Did not recognize line " + linenum + " as anything");
			return false;
		}
	}

	return true;
}

function attempt_parse_condchain(body, linenum)
{
	let line = body[--linenum].trim();
	let regex_elseif = /else if\((.*)\)/;
	let partial_match = line.match(/^if\((.*)\)$/);

	// console.log("Partial: " + partial_match);
	if(!partial_match)
		return false;

	let expressions = [];
	let bodies = [];

	let if_start = linenum + 1;
	if(body[if_start].trim() !== "{")
		return false;
	let if_end = find_closing_brace(body, if_start);
	
	if(if_end < 0)
		return false;

	expressions.push(partial_match[1]);
	bodies.push(lines_in_range(body, if_start + 1, if_end - 1));

	linenum = if_end + 1;
	while(linenum < body.length && (partial_match = body[linenum].match(regex_elseif)))
	{
		let body_start = linenum + 1;
		if(body_start >= body.length || body[body_start].trim() !== "{")
		{
			console.log("Something has gone wrong,");
			console.log("else if statement doesn't have opening brace");
			return false;
		}

		let body_end = find_closing_brace(body, body_start);
		if(body_end < 0)
			return false;

		expressions.push(partial_match[1]);
		bodies.push(lines_in_range(body, body_start + 1, body_end - 1));
		linenum = body_end + 1;
	}

	if(linenum < body.length)
	{
		partial_match = body[linenum].match(/else/);
		if(partial_match)
		{
			let else_start = linenum + 1;
			if(else_start >= body.length || body[else_start].trim() !== "{")
			{
				console.log("Something has gone wrong,");
				console.log("else statement doesn't have opening brace");
				return false;
			}

			let else_end = find_closing_brace(body, else_start);
			if(else_end < 0)
				return false;

			bodies.push(lines_in_range(body, else_start + 1, else_end - 1));
		}
	}

	return {expressions: expressions, bodies: bodies, nextlinenum: linenum};
}

// See: https://regexr.com/5kdhg
function attempt_parse_assignment(line)
{
	return line.match(/([a-zA-Z]\w*) ([+\-*/]?=) (.*);/);
}

function attempt_parse_return(line)
{
	return line.match(/return ([^;]*);/);
}

function attempt_parse_varinit(line)
{
	return line.match(/([a-zA-Z]\w*) ([a-zA-Z]\w*) = (.*);/);
}

function attempt_parse_vardec(line)
{
	return line.match(/([a-zA-Z]\w*) ([a-zA-Z]\w*);/);
}

function attempt_parse_arraydec(line)
{
	let partial_match = line.match(/([a-zA-Z]\w*)(\[.*\]) ([a-zA-Z]\w*);/);

	if(!partial_match)
		return false;
	let var_type = partial_match[1];
	let array_name = partial_match[3];
	let bracketsstr = partial_match[2];

	let match = [];
	match.push(line);
	match.push(var_type);
	match.push(array_name);

	let curr_brackargstr = "";
	let depth = 1;

	for(let i = 1; i < bracketsstr.length && depth >= 0; i++)
	{
		let curr_char = bracketsstr.charAt(i);

		if(curr_char === "]" && depth == 1)
		{
			match.push(curr_brackargstr);
			curr_brackargstr = "";
			depth--;
			continue;
		}
		else if(curr_char === "]")
			depth--;
		else if(curr_char === "["){
			depth++;
			if(depth == 1)
				continue;
		}

		curr_brackargstr += curr_char;
	}

	if(depth != 0)
	{
		console.log("Something has gone wrong,");
		console.log("Lexing finds that input string \"" + line + "\" has imbalanced brackets");
		return false;
	}
	
	return match;
}

// How to know you're moving onto next argument rather than still in
// an expression when you come across a comma? Check if you are inside
// an expression by tracking your depth.
function attempt_parse_funcinvoke(line)
{
	let match = [];
	match.push(line); // To follow the format

	let partial_match = line.match(/([a-zA-Z]\w*)\((.*)\);/);
	if(!partial_match)
		return false;
	let func_name = partial_match[1];
	let argliststr = partial_match[2];

	match.push(func_name);

	let curr_argstr = "";
	let depth = 0;
	for(let i = 0; i < argliststr.length; i++)
	{
		let curr_char = argliststr.charAt(i);

		if(curr_char === "," && depth == 0)
		{
			match.push(curr_argstr);
			curr_argstr = "";
			continue;
		}
		else if(curr_char === "(")
			depth++;
		else if(curr_char === ")")
			depth--;

		curr_argstr += curr_char;
	}

	// last argument not followed by comma.
	match.push(curr_argstr);
	return match;
}

// See: https://regexr.com/5kcv7
//
// Matches three groups. match[1] gives return type, match[2] is
function attempt_parse_function(line)
{
	return line.match(/\s*function ([a-zA-Z]\w*) ([a-zA-Z]\w*)\(([a-zA-Z0-9_, ]*)\)\s*/);
}

// See: https://regexr.com/5kd0e
//
function attempt_parse_args(arglist)
{
	arglist = arglist.trim();
	if(arglist.length == 0)
		return {args: [], isError: false, argind: -1, errmsg: ""};

	let arg_strings = arglist.split(",");
	let arguments = new Array(arg_strings.length);
	for(let i = 0; i < arg_strings.length; i++)
	{
		// arg = arg_strings[i].match(/ *(int|string|double|bool) ([a-zA-Z][a-zA-Z0-9_]*) */);
		arg = arg_strings[i].match(/ *([a-zA-Z]\w*) ([a-zA-Z][a-zA-Z0-9_]*) */);
		if(arg)
			arguments[i] = {var_type: arg[1], var_name: arg[2]};
		else{
			msg = "could not parse argument string " + i + ": \"" + arg_strings[i] + "\"";
			return {args: null, isError: true, argind: i, errmsg: msg}
		}
	}

	return {args: arguments, isError: false, argind: -1, errmsg: ""};
}

// Utility functions

function find_closing_brace(body, line_start)
{
	let first_line = body[line_start];
	first_line = ignore_comment(first_line).trim();
	if(first_line !== "{")
		return -1;

	let depth = 1;
	let linenum = line_start;
	while(depth != 0 && linenum < body.length)
	{
		linenum++;

		let line = body[linenum];
		line = ignore_comment(line).trim();

		if(line === "{")
			depth++;
		else if(line === "}")
			depth--;
		else if(!braces_balanced_line(line)){
			console.log("Imbalanced braces in line " + linenum);
			return -2;
		}
	}

	if(depth != 0)
		return -3;

	return linenum;
}

function braces_balanced_line(line)
{
	let count = 0;

	for(let i = 0; i < line.length && count >= 0; i++)
	{
		if(line.charAt(i) === "{")
			count++;
		else if(line.charAt(i) === "}")
			count--;
	}

	return count == 0;
}

function lines_in_range(code_lines, start, end)
{
	let body = [];
	for(let i = start; i <= end; i++)
		body.push(code_lines[i]);

	return body;
}

function create_signature_string(arguments, func_name)
{
	let signature = "";
	for(let i = 0; i < arguments.length; i++)
		signature += arguments[i].var_type + ",";

	signature += "$" + func_name;
	return signature;
}

function ignore_comment(line)
{
	let comment_start = line.indexOf("//");
	if(comment_start != -1)
		return line.substring(0,comment_start);
	else
		return line;
}

function count_char_occurences(line, c)
{
	let count = 0;

	for(let i = 0; i < line.length; i++)
		if(line.charAt(i) === c)
			count++;

	return count;
}