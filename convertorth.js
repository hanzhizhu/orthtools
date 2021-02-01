/**
 * This file processes the input info from orthtools.html using Knockout bindings
 */
requirejs.config({
		baseUrl: '../jslib',  
		paths: {
		knockout:   'knockout-3.5.1',      
		jquery:     'jquery-3.4.1.min',
    }
});

requirejs(['knockout', 'jquery'],
         function( ko, $) {

// Overall viewmodel for this screen, along with initial state
function AppViewModel() {
	const MAX_CHARS = 10000;
	var self = this;

	self.txtdata = ko.observable("");
	self.lang = ko.observable();
	self.ce = ko.observable(false); //content-editable toggle
	self.outdir = ko.observable("ltr"); //output text direction
	self.display = ko.observable("Welcome! Your text will appear here.");
	self.version = ko.observable(); 
	self.outorth =  ko.observable(); //output orthography: l(atin), c(yrillic), or a(rabic)
	self.curver = ko.observable();

	const langcodes = ["kz", "en", "fa", "ru"]; //TODO populate from server
	const langdict = {};
	for (let i = 0; i < langcodes.length; i++)
		langdict[langcodes[i]] = i; //populates dict of lang codes to int indices 

	const langnames = { //TODO populate from server
	'l': [ "qazaqsha", "english",   "farsi", "russian"],
	'c': [  "қазақша",        "",   "форси", "русский"],
	'a': [  "قازاقشا",        "",   "فارسی",        ""]
	};

	//sample array of extra version for a given langcode and orth code (l/c/a)
	const extraversions = {"kz l": ["qazaqsha", "qazaqşa"] }
	
	self.versions = ko.computed(function() {
		var langorth = self.lang() + " "
		if (self.outorth) langorth += self.outorth
		if (langorth in extraversions) 
			return extraversions[langorth];
		return [];
	});

	// performs updates upon the user selecting from drop-down box of extra versions
	self.curver.subscribe(function(newversion) {
		if (newversion) {
			self.version(newversion);
			self.sendTask(self.outorth(), newversion);
		} else 
			self.sendTask(self.outorth(), 0);
	});
	
	// returns full language name as populated from the langnames dict
	self.langname = ko.computed(function() {
		if(self.lang() && self.outorth()) {
			var langnum = langdict[self.lang()];
			return langnames[self.outorth()[0]][langnum];
		}
		return "";
	});

	//computes orthography of text in input box from Unicode heuristics
	self.inorth = ko.computed(function() {
		var td = self.txtdata();
		for (let c of td) {
			if (c >= 'Ѐ' && c <= 'ӿ') {
				return "cyr";
			} else if (c >= 'ء' && c <= 'ە') {
				return "ara";
			} else if (c >= 'A' && c <= 'z') {
				return "lat";
			}
		}
        return "unk"; //unknown
	}); 
	
	//direction of text in input box
	self.indir = ko.computed(function() {
		if (self.inorth() === "ara") return "rtl";
		return "ltr";
	});
	
	//toggles content-editable
	self.edit = function() {
		self.ce(!self.ce());
	}
	
	//clears input infor
	self.clear = function() {
		self.display();
		self.lang();
		self.ce(false);
		self.version();
		self.outorth();
	}
	
	//communicates with server s
  self.sendTask = function(orthselection, ver) {	
		if (orthselection === 'l') orthselection = "lat";
		if (orthselection === 'c') orthselection = "cyr";
		if (orthselection === 'a') orthselection = "ara";
		if (orthselection === 'ara')
			self.outdir( "rtl");
		else self.outdir("ltr");
		
		var strData = self.txtdata().trim();
		if (strData.length > MAX_CHARS || strData.length == 0) {
			if (strData.length > MAX_CHARS) 
				self.display("Maximum length exceeded.");
			return;
		}
		
		$.ajax({
		url: "http://WEBSITE_URL/convertorth", //TODO
		type: "POST",
		data: {"txtdata": strData, "inorth": self.inorth(), "orthsel": orthselection, "outver": ver}, 
		error : () => void self.display("could not process data"),
		success : (data) => {   
			self.outorth(orthselection[0]); //i.e. trims "lat" to "l"
			self.lang(data.substring(0,2)); //TODO: first two chars in response form = lang code
			self.display(data.substring(2)); //output text 			
		}  
		});   
	}
}

$('#maindispl').on('paste', function() {
    //strips elements added to the editable tag when pasting
    var $self = $(this);
    setTimeout(function() {$self.html($self.text());}, 0);
}).on('keypress', (e) => e.which != 13 );  //ignores enter key);

ko.applyBindings(new AppViewModel(), document.getElementById("tlview"));

});