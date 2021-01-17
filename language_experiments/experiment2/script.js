// HTML Stuff
let code_area_elem = document.getElementById("code_area");

// Stack of local contexts.
let context_stack = [];

// two dicts of variables. Keys are variable names, values are
// the variables. Variables are objects of form {type: , value: }.
// global vars are declared at top of game code. Initialized at startup.
let global_context = {state_vars: {}, scratch_vars: {}};

// dict of variables, and stack of scopes. Scopes are lists containing
// variables that were declared within the scope.
let curr_local_context = {variables: {}, scopes_stack: []};

// For easier reference. But will need to be updated when context changes.
let curr_local_vars = curr_local_context.variables;
let curr_scopes_stack = curr_local_context.scopes_stack;
curr_scopes_stack.push([]); // Initial scope.

let global_state_vars = global_context.state_vars;
let global_scratch_vars = global_context.scratch_vars;

function dumpData()
{
	console.log("Context Stack: ",context_stack);
	console.log("Global Context: ",global_context);
	console.log("Current Local Context: ",curr_local_context);

	console.log("Variables visible in current scope:");
	for(let var_name in curr_local_vars)
	{
		let var_obj = curr_local_vars[var_name];
		let var_type = var_obj.type;
		let var_value = var_obj.value;

		let msg = "Variable \"" + var_name + "\"";
		msg += " of type \"" + var_type + "\"";
		msg += " has value ";
		if(var_type === "string")
			msg += "\"" + var_value + "\"";
		else
			msg += var_value;
		console.log(msg);
	}
}

// var_value can be undefined if this is just a declaration
// responsibility is on callee to make sure value inputted here matches type.
function declare_var(context, var_type, var_name, var_value)
{
	if(var_name in curr_local_vars)
	{
		console.log("Something went wrong,");
		console.log("attempted to declare local variable that already exists.");
		return false;
	}
	else if(var_name in global_state_vars)
	{
		console.log("Something went wrong,");
		console.log("attempted to declare global state variable that already exists.");
		return false;
	}
	else if(var_name in global_scratch_vars)
	{
		console.log("Something went wrong,");
		console.log("attempted to declare global scratch variable that already exists.");
		return false;
	}

	let var_obj = {type: var_type, value: var_value};

	if(context === "globalState")
		global_state_vars[var_name] = var_obj;
	else if(context === "globalScratch")
		global_scratch_vars[var_name] = var_obj;
	else if(context === "local")
	{
		curr_local_vars[var_name] = var_obj;
		let latest_scope = curr_scopes_stack[curr_scopes_stack.length - 1];
		latest_scope.push(var_name); // to destroy when we leave context
	}
	else
	{
		console.log("Something went wrong,");
		console.log("attempted to declare variable in an invalid context");
	}

	return true;
}

// var_type we would get when we evaluate an expression. Has to match
// type that the variable is declared as.
function set_var(var_type, var_name, var_value)
{
	let var_obj = null;

	if(var_name in curr_local_vars)
		var_obj = curr_local_vars[var_name];
	else if(var_name in global_state_vars)
		var_obj = global_state_vars[var_name];
	else if(var_name in global_scratch_vars)
		var_obj = global_scratch_vars[var_name];
	else
	{
		console.log("Something went wrong,");
		console.log("attempted to assign a value to a variable that wasn't declared.");
		return false;
	}
	
	var_obj = curr_local_vars[var_name];
	if(var_obj.type !== var_type)
	{
		console.log("Something went wrong,");
		console.log("attempted to assign a value to a variable that doesn't match it's type.");
		return false;
	}

	var_obj.value = var_value;
	return true;
}

// Returns null if no such variable, undefined if variable is declared
// but doesn't have a value set.
// returns var object {type: , value: } specifically.
function get_value_of_var(var_name)
{
	if(!(var_name in curr_local_vars))
		return null;

	var_obj = curr_local_vars[var_name];
	if(var_obj.value === undefined)
		return undefined;

	return var_obj;
}

// Returns true on success.
function enter_scope()
{
	curr_scopes_stack.push([]);
	return true;
}

// Returns true on success.
// Variables that were declared in current scope are deleted here.
function exit_scope()
{
	if(curr_scopes_stack.length == 0)
	{
		console.log("Something went wrong,");
		console.log("attempted to exit scope, but there are no scopes left to pop");
		return false;
	}

	let scoped_vars = curr_scopes_stack.pop();
	for(let i = 0; i < scoped_vars.length; i++)
	{
		let var_name = scoped_vars[i];
		if(var_name in curr_local_vars)
		{
			delete curr_local_vars[var_name];
		}
		else
		{
			console.log("Something went wrong,");
			console.log("attempted to remove variable \"" + var_name + "\" that doesn't exist");
			return false;
		}
	}

	return true;
}

// Job is on interpreter to know what it was working on last.
// This only saves the local context.
function push_context()
{
	context_stack.push(curr_local_context);
	curr_local_context = {variables: {}, scopes_stack: []};

	curr_local_vars = curr_local_context.variables;
	curr_scopes_stack = curr_local_context.curr_scopes_stack;
}

// Restores the state of local variables.
function pop_context()
{
	if(context_stack.length == 0)
	{
		console.log("Something went wrong,");
		console.log("attempted to exit context, but there are no contexts left to pop");
	}

	curr_local_context = context_stack.pop();
	curr_local_vars = curr_local_context.variables;
	curr_scopes_stack = curr_local_context.curr_scopes_stack;
}