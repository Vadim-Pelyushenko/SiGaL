// HTML Stuff
let code_area_elem = document.getElementById("code_area");

// Interpreter Data
let program_lines = null;
let func_table = {}; // starts off as empty dict
let var_table = {};

function processCode()
{
	let program = code_area_elem.value;
	parseGlobalsAndFunctions(program);
}

function parseGlobalsAndFunctions(program)
{
	program_lines = program.match(/[^\r\n]+/g);
	// for(let i = 0; i < program_lines.length; i++)
	// 	console.log("Line #" + i + ": \"" + program_lines[i] + "\"");

	let globals_parsed = false;
	let parse_error = false;
	for(let linenum = 0; linenum < program_lines.length; linenum++)
	{
		console.log("Processing line " + linenum);
		let line = program_lines[linenum];
		console.log("Contents of line: \"" + line + "\"");
		line = ignore_comment(line);
		console.log("After removing comments: \"" + line + "\"");

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
				break;
			}

			arguments = result.args;
			console.log("Successfully parsed function signature");
			console.log("Function name: " + func_tokens[2]);
			console.log("Return type: " + func_tokens[1]);
			console.log("Arguments: ");
			if(arguments.length == 0)
				console.log("*Empty arguments*");
			for(let i = 0; i < arguments.length; i++)
			{
				arg = arguments[i];
				console.log("\"" + arg[2] + "\" of type \"" + arg[1] + "\"");
			}
			console.log("\n");
		}
		else if(line.match(/\bfunction\b/))
		{
			console.log("Improperly formatted function at line " + linenum);
		}
		else
		{
			console.log("Did not recognize line " + linenum + " as anything");
		}

	}
}

function ignore_comment(line)
{
	let comment_start = line.indexOf("//");
	if(comment_start != -1)
		return line.substring(0,comment_start);
	else
		return line;
}

// See: https://regexr.com/5kcv7
// 
function attempt_parse_function(line)
{
	return line.match(/\W*function (void|int|string|double|bool) ([a-zA-Z]\w*)\(([a-zA-Z0-9_, ]*)\)\W*/);
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
		arg = arg_strings[i].match(/ *(int|string|double|bool) ([a-zA-Z][a-zA-Z0-9_]*) */);
		if(arg)
			arguments[i] = arg;
		else{
			msg = "could not parse argument string " + i + ": \"" + arg_strings[i] + "\"";
			return {args: null, isError: true, argind: i, errmsg: msg}
		}
	}

	return {args: arguments, isError: false, argind: -1, errmsg: ""};
}

function arithmethic_parsing(line){
	//return log error if parentheses do not match up
	if(is_balanced(line)==false){
		console.log("Expression not balanced");
	}
}

//stack implementation of balanced parentheses
//https://paulrohan.medium.com/parenthesis-matching-problem-in-javascript-the-hacking-school-hyd-7d7708278911
function is_balanced(line){
    let stack = [];
    let matching = {
        '(': ')',
        '[': ']',
        '{': '}'
	}	
    for (let i = 0; i < line.length; i++) {
        // If character is an opening brace add it to a stack
        if (line[i] === '(' || line[i] === '{' || line[i] === '[' ) {
            stack.push(line[i]);
        }
        //  If that character is a closing brace, pop from the stack, which will also reduce the length of the stack each time a closing bracket is encountered.
        else {
            let last = stack.pop();

            //If the popped element from the stack, which is the last opening brace doesn’t match the corresponding closing brace in the map, then return false
            if (line[i] !== matching[last]) {return false};
        }
    }
    // By the completion of the for loop after checking all the brackets of the str, at the end, if the stack is not empty then fail
        if (stack.length !== 0) {return false};

    return true;
}
