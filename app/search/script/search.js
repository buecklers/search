/**********************************************************************
//Document: search.json
//Date of creation: 11-03-2014
//Last change: 13-05-2014
//Author: T.Buecklers
//Version: 1.3
//Function: AngularApp - Search Page of PSI Wiki


Copyright (C) 2014 Paul Scherrer Institut, Switzerland
*/


var searchApp = angular.module('searchApp',['ngSanitize', 'ui.bootstrap'])

//Some fixed parameters for the search query that stay unchanged
var qt = 'edismax'; //default request handler from Solr. 
var topic = 'PSI.Search'; //search topic
var wt = 'json'; //result format
//And some more fixed parameters in the prepared search URL for Solr safed in the base URL
var searchUrlBase = "/"+instdir+"/php/search.php?fl=type,date,field_TopicType_lst,language,author,web,contributor,tag,id,topic,container_title,container_url,icon,title,name,url,comment,thumbnail,field_CurrentState_s&facet=true&facet.field=type&facet.field=field_TopicType_lst&facet.field=language&facet.field=author&facet.field={!ex=web}web&facet.field=contributor&facet.field=tag&f.type.facet.mincount=1&facet.query={!key=%271%20hour%27%20ex=date}date:[NOW-1HOUR%20TO%20NOW]&facet.query={!key=%274%20hours%27%20ex=date}date:[NOW-4HOUR%20TO%20NOW]&facet.query={!key=%27today%27%20ex=date}date:[NOW/DAY%20TO%20NOW]&facet.query={!key=%272%20days%27%20ex=date}date:[NOW/DAY-1DAY%20TO%20NOW]&facet.query={!key=%277%20days%27%20ex=date}date:[NOW/DAY-7DAY%20TO%20NOW]&facet.query={!key=%271%20month%27%20ex=date}date:[NOW-1MONTH%20TO%20NOW]&facet.query={!key=%272%20months%27%20ex=date}date:[NOW-2MONTH%20TO%20NOW]&facet.query={!key=%271%20year%27%20ex=date}date:[NOW-1YEAR%20TO%20NOW]&facet.query={!key=%27older%27%20ex=date}date:[*%20TO%20NOW/YEAR]&f.date.facet.mincount=1&f.field_TopicType_lst.facet.mincount=1&f.language.facet.mincount=1&f.author.facet.mincount=1&f.web.facet.sort=title&f.web.facet.limit=-1&f.web.facet.mincount=1&f.contributor.facet.mincount=1&f.tag.facet.limit=100&f.tag.facet.mincount=1&spellcheck=true&spellcheck.count=3&spellcheck.collate=true&spellcheck.maxCollations=3&spellcheck.maxCollationTries=10&hl=true&hl.fl=text&hl.snippets=2&hl.fragsize=300&hl.mergeContignuous=true&hl.usePhraseHighlighter=true&hl.highlightMultiTerm=true&hl.alternateField=text&hl.maxAlternateFieldLength=300&hl.useFastVectorHighlighter=true";

var searchUrl = searchUrlBase;

/**
Facets are prepared in a class. It is instantiated and used for all facets. The specific behaviour can be configured

@param fname (String)
Name of the facet. Used for identification and visualization.
@param multi (boolean)
true if multiple choice is possible
@param view (boolean)
true if the facet stays visible after selection
@param operator (String)
if multiselect is possible, this param says how they are combined. 
@param mapping (object)
Json Object (key:value) with visualization mapping for the facet's items
*/
function facet(fname, multi, view, operator, mapping){
	this.fname = fname;
	this.multiSelect = multi; 
	this.viewMultiSelect = view;
	this.operator = operator;
	this.mapping = mapping;
	this.items = new Array();
	this.responseFq;
	this.prevState = new Array();
	this.filter = new Array();
	
/**
used if the "facet count" in the response is sent as an array - normal case in "facet_fields"
the arrays content will be filled into the items Array of Json Objects. If a filter is defined for this facet, the items will be filtered first. 
@param ItemArray
The Array with the items for the facet
@return void
*/
	this.fillWithArray = function(ItemArray){
		//array in items packen
		this.prevState.length = 0;
		this.prevState = this.items.slice(0);
		this.items.length = 0;
		for(var i=0; i<ItemArray.length; i=i+2){
			var checked = false			
			var value = ItemArray[i*1];
			var count = ItemArray[i+1];
			var title = value;
			checked = this.termInFilterQuery(value);
			//Mapping
			if(typeof(this.mapping) !== 'undefined' && typeof(this.mapping[value]) !== 'undefined'){
				title = this.mapping[value];
			}
			if(typeof(this.filter) !== 'undefined' && !this.inFilter(title) && count > 0) {
				this.items.push({"name":this.fname, "title":title, "value":value, "count":count, "checked":checked});
			}
		}
	}
	
/** 
used if the "facet count" is sent as a json object - normal case in "facet_queries"
Json content will be filled into items array. If there's a filter defined, the input will be filtered first. 
@param ItemJason (Json Object)
Items to be copied into items array
@return void
*/
	this.fillWithJson = function(ItemJason){
		//json in items packen
		this.prevState.length = 0;
		this.prevState = this.items.slice(0);  //alter Zustand sichern
		this.items.length = 0;
		for(var key in ItemJason){
			var checked = false;
			var title = key;
			var count = ItemJason[key]
			var value = title;
			
			//Mapping
			if(typeof(this.mapping) !== 'undefined' && typeof(this.mapping[title]) !== 'undefined'){
				value = this.mapping[title];
				checked = this.termInFilterQuery(value);
			}
			if(typeof(this.filter) !== 'undefined' && !this.inFilter(title) && count > 0){
				this.items.push({"name":this.fname, "title":title, "value":value, "count":count, "checked":checked});
			}
		}
	}
/**
Sets the response's filter query. This is used to figure out, which items has been selected
@param fq (String)
Filter query
@return void
*/	
	this.setResponseFq = function(fq){
		this.responseFq = fq;
	}
	
/**
Sets the mapping for this facet
@param map (Json Object)
Visualization mapping
@return void
*/	
	this.setMapping = function(map){
		this.mapping = map;
	}
	
/**
Sets the filter to be used in this facet.
@param filter (Array)
Array with strings of the item's names that should not be used in the facet
@return void
*/	
	this.setFilter = function(filter){
		this.filter = filter;
	}

/**
Return the Arra of items as Json Objects which are setup as follows: 
name of facet, title of item, value of item (might be different to title), count of search results, checked - true if selected
@return array with Json objects
Items of the facet. 
*/	
	this.getItems = function(){
		//returns items as a json string
		return this.items;
	}

/**
The items can be fetched in slices if necessary for the visualization
@param ItemPerSlide
number of items per slide
@return
Array of arrays filled with Items as Json Objects.
*/	
	this.getItemsInSlides = function(ItemsPerSlide){
		noOfSlides = Math.floor(this.items.length/ItemsPerSlide);
		var slides = new Array();		
		for(var i=0; i<this.items.length; i=i+ItemsPerSlide){
			var slide = new Array();
			slide = this.items.slice(i, i+ItemsPerSlide);
			slides.push(slide);		
		}
		return slides;
	}
	//checks filter query in params which facet items are selected
	this.getCheckedItems = function(){
		var checkedItems = new Array();
		for(var i=0; i<this.responseFq.length; i++){
			var fqrespterm = this.responseFq[i].toString();
			var key = this.fname+":";
			if(fqrespterm.match(key)){
				var start = fqrespterm.indexOf(key)+key.length;
				var erg = fqrespterm.substring(start, fqrespterm.length);
				if(this.multiSelect){	//space separated list in () klammern
					erg = erg.substring(1, erg.length-1); //klammern weg
					var terms = erg.split(' ');
					for(var y=0; y<terms.length; y++){
						if(typeof(this.mapping) !== 'undefined' && typeof(this.mapping[terms[y].trim()]) !== 'undefined'){
							checkedItems.push(this.mapping[terms[y].trim()]);
						}else{
							checkedItems.push(terms[y].trim());
						}
					}				
				}else{
					if(typeof(this.mapping) !== 'undefined'){
						checkedItems.push(this.searchMapping(erg));
					}else{
						checkedItems.push(erg.trim());
					}								
				}
			}
		}
		return checkedItems;
	}
/**
Unchecks all items in the facet
@return void
*/
	this.resetFacet = function(){
		this.items = new Array();
	}
/**
Checks the visualization rules if facet is visible or not depending on "view" param and if an item is selected.
@return (boolean)
true if visible, false if not
*/	
	this.isVisible = function(){
		//visibility abhängig von viewMultiSelect und ob ein item selected
		var ret = true;
		if(!this.viewMultiSelect){
			for(var i=0; i<this.items.length; i++){
				if(this.items[i].checked){
					ret = false;
				}
			}
		}
		if(this.items.length <=0){
			ret=false;
		}			
		return ret;
	}
/**
According to the checked items in the facet and the logical rules, the facet's contribution to the search query is generated and returned. 
@return (String)
String to be appended to the search query string that represents the facet's filtering options.
*/
	this.getRequestQuery = function(){
		//returns part of fq query (ein array item)
		var fqPart = '';
		var fqOrPart = '{!tag='+this.fname+' q.op=OR}'+this.fname+':(';
		var fqFilled = false;
		var doubleCount = 0;
		//check if muliple items clicked
		for(var i=0; i<this.items.length; i++){
			if(this.items[i].checked === true){
				doubleCount += 1; 
			}
		}
		
		for(var i=0; i<this.items.length; i++){
			if(this.items[i].checked){				
				if(this.multiSelect){
					fqFilled = true;
					if(operator.toUpperCase() == 'OR'){
						fqOrPart += this.items[i].value+' ';
					}else{
						fqPart = '{!tag='+this.fname+'}'+this.fname+':['+this.items[i].value+']'
					}
				}else{
					if(this.checkedInPrevState(this.items[i].value) && doubleCount >= 2){
						//uncheck
						this.items[i].checked = false;
					}else{
						if(this.viewMultiSelect){
							fqPart = '{!tag='+this.fname+'}'+this.fname+':'+this.items[i].value;
						}else{
							fqPart = this.fname +":"+this.items[i].value;
						}
					}
					
				}
			}
		}
		if(fqFilled && operator.toUpperCase() == 'OR'){
			fqPart = fqOrPart.trim()+')';
		}
		return '&fq='+fqPart;
	}
	
//helpers - some helpfull functions

/**
Checkes if a term is contained in the current filter query - returned with the search results - to check whether an item has been selected for the last search request
@param fqterm (string)
the filter query string that has to be checked
@return (boolean)
true if selected
*/
	this.termInFilterQuery = function(fqterm){
		for(var i=0; i<this.responseFq.length; i++){
			var fqrespterm = this.responseFq[i].toString();
			var key = this.fname+":";
			if(fqrespterm.match(key)){
				var start = fqrespterm.indexOf(key)+key.length;
				var erg = fqrespterm.substring(start, fqrespterm.length);
				if(this.multiSelect){	//space separated list in () klammern
					erg = erg.substring(1, erg.length-1); //klammern weg
					var terms = erg.split(' ');
					for(var y=0; y<terms.length; y++){
						if(terms[y].trim() === fqterm.trim()){
							return true;
						}
					}				
				}else{
					if(erg.trim() === fqterm.trim()){
						return true
					}
				}
			}
		}
		return false;
	};
/**
The status of the items is kept to check later if the items has been checked before.
@value (String)
value of the item that should be checked if it was selected last timeMap
@return (boolean)
true if it was selected before. 
*/	
	this.checkedInPrevState = function(value){
		retVal = false;
		for(var i=0; i<this.prevState.length; i++){
			if(this.prevState[i].value === value && this.prevState[i].checked === true){
				retVal = true;
			}
		}
		return retVal;
	}
/**
Checks if an item is in the black list and returns true if it is.
@param (String)
value of the item that should be checked
@return (boolean)
true if term in filter.
*/	
	this.inFilter = function(fterm){
		retval = false;
		for(var i=0; i<this.filter.length; i++){
			var regexp = '.*'+this.filter[i];
			if(fterm.match(regexp)){
				retval = true;
			}		
		}		
		return retval
	}
	//search in mapping. get key for value or value for key
	this.searchMapping = function(term){
		if(this.mapping[term.trim()] !== undefined){
			return this.mapping[term];
		}else{
			for(key in this.mapping){
				if(this.mapping[key] == term){
					return key;
				}
			}
		}
		return term;
	}
}
//end of facet class

/**
Factory Method of this Angular search application. Offers the response from Solr as a promise. 
@return getSearchResults method
where the callback method is injected.
*/

 searchApp.factory('searchEngine', function($q, $http){
	var getSearchResults = function(searchUrl){
		var deferred = $q.defer();
		$http.get(searchUrl).success(function (data){
			deferred.resolve(data);
			
		}).
		error(function(data){
			console.log('Error from Search Engine');
		});

		return deferred.promise;
	}
	return {
		getSearchResults : getSearchResults
		};
})
/**
The controller assembles the search query, sends it to the search engine, and computes the response. All viewable data are bonded to the front end view. 
*/
searchApp.controller('resultListCtrl', ['$scope', '$http', '$sanitize',  '$location', '$timeout', 'searchEngine', function ($scope, $http, $sanitize, $location, $timeout, searchEngine){
	//read the filter maps - this should actually be in a config. 
	initFilternMaps();
	
	//set default values or - if existing - take them from the URL query
	var searchObj = $location.search();
	q = searchObj['q'] == undefined ? '': searchObj['q'];
	fq = searchObj['fq'] == undefined ? ' -web_search:Applications' :  searchObj['fq'];
	start = searchObj['start'] == undefined ? 0 : searchObj['start'];
	rows = searchObj['rows'] == undefined ? 10 : searchObj['rows'];
	sort = searchObj['sort'] == undefined ? 'score desc' : searchObj['sort'];
	//save them in $scope
	$scope.rows = rows;
	$scope.searchTerm = q;
	$scope.fq = fq;
	$scope.orderProp = sort;	
	$scope.start = start;
	$scope.currentPage = $scope.start*1/$scope.rows+1;	
	
	//instantiate and configure the facet objects
	var webFacet = new facet("web", true, true, "OR");
	webFacet.setMapping($scope.webMap);
	var mediaFacet = new facet("type", false, false);
	var recentFacet = new facet("date", false, true);
	
	var langFacet = new facet("language", false, false);
	var topicTypeFacet = new facet("field_TopicType_lst", false, true);
	topicTypeFacet.setFilter($scope.topicTypeFilter);
	var authorFacet = new facet("author", false, false);
	authorFacet.setFilter($scope.authorFilter);
	
	/**
	Search with delay: registers every new letter in the search box and after a minimum of two letters and a delay of 500ms runs the search.
	@return void
	*/
	var timer;	
	$scope.searchWDelay = function(){
		if($scope.searchTerm.length > 2){
			if(typeof(timer) != 'undefined'){
				$timeout.cancel(timer);
				$scope.currentPage = 1;
				$scope.start = 0;
				timer = $timeout(function(){$scope.search(true)}, 500);
			}else{
				$scope.currentPage = 1;
				$scope.start = 0;
				timer = $timeout(function(){$scope.search(true)}, 500);
			}
		}
	}
	
	/**
	Is called when a search suggestion is clicked in the front end. Changes search term and starts search
	@param term (String)
	search term selected from the list of suggestions. 
	@return void
	*/
	$scope.searchSuggestion = function(term){
		$scope.searchTerm = term;
		q = term;
		$scope.search(true);
	}
	
	/**
	Changing the page with the pagination does not need a full search. Start parameter is changed and a non-full search is started.
	@param pageNo (String)
	Page number to be switched to. 
	@return void
	*/
	$scope.setPage = function (pageNo) {
		if($scope.numFound > 0){		//bei history back soll Aufruf vermieden werden
			$scope.start = (pageNo-1)*$scope.rows;
			$scope.search(false);
		}
	};
	
	/**
	Used for deleting search term or resetting a facet. The facetId (name) is sent to the search to let it know which one to reset. The certain facet is reset with the respective method.
	@param facetId (String), facetName (String)
	facetName = system name, name of the facet object
	facetId = name for identification
	@return void
	*/
	$scope.resetFacet = function(facetId, facetName){
		if(facetId !== 'searchTerm'){
			eval(facetName+".resetFacet()");
			$scope.search(facetId);
		}else{
			$scope.searchTerm = '';
			$scope.search(facetId);
		}
	}
	
	/**
	Running search with the "Enter" key.
	@param event (Object)
	The event object sent by eventhandler
	@return void
	*/
	$scope.keyPressed = function(event){
		if(event.keyCode == 13){
			$scope.search(true);
		}
	}
	
	//default value for full search.
	var full = true;
	/**
	Runs the search: concatenating search query, sending query, analysing response, update view.
	@param full (boolean || sting)
	true = full search.
	false = partly search - no facet update needed
	[String] facet name: facet that has to be reset or 'init' for initial search.
	@return void
	*/
	$scope.search = function(full){
	searchUrl = searchUrlBase;
	//on init search, filter query is newly concatenated with contribution from every facet object.
	if(full != 'init'){
		if(full == true || full == false){
			fq =' -web_search:Applications';
			
			//facet filtering -> der jeweilige Beitrag zu filter query wird von den einzelnen facetten abgefragt
			if(mediaFacet.getRequestQuery().length > 4){
				fq += mediaFacet.getRequestQuery();
			}
			if(webFacet.getRequestQuery().length > 4){
				fq += webFacet.getRequestQuery();
			}
			if(recentFacet.getRequestQuery().length > 4){
				fq += recentFacet.getRequestQuery();
			}
			if(langFacet.getRequestQuery().length > 4){
				fq += langFacet.getRequestQuery();
			}
			if(topicTypeFacet.getRequestQuery().length > 4){
				fq += topicTypeFacet.getRequestQuery();
			}
			if(authorFacet.getRequestQuery().length > 4){
				fq += authorFacet.getRequestQuery();
			}
		}else{//only a facet reset or a page turn
			var fqtemp = $scope.fq;
			fq =' -web_search:Applications';
			fqtemp.forEach(function(value){
				if(!value.match(full+':') && !value.match('-web_search') && !value.match('access_granted')){
					fq+='&fq='+value;
				}
			});
		}
	}

	//fetching all necessary params
	params = {
		'qt':qt,
		'rows':$scope.rows,
		'topic':topic,
		'q':$scope.searchTerm, 
		'sort':$scope.orderProp,
		'fq':fq,
		'wt':wt,
		'start':$scope.start
			  };
	//concatenate them to a search string
	var paramString = '';
	for (var key in params){
		if(params[key] != ''){
			paramString += '&'+key+'='+params[key];
		}
	}
	searchUrl+=paramString;

		
//we also create a reduced set of params to write into our URL query (to keep it in mind)

	var persParams = {
		'q':$scope.searchTerm,
		'fq':fq,
		'start':$scope.start,
		'rows':$scope.rows,
		'sort':$scope.orderProp
			};
	//but the default values are not needed again -> delete	
	if(persParams.q == '') delete persParams.q;
	if(persParams.start == 0) delete persParams.start;
	if(persParams.fq == ' -web_search:Applications') delete persParams.fq;
	if(persParams.rows == 10) delete persParams.rows;
	if(persParams.sort == 'score desc') delete persParams.sort;
	$location.search(persParams);



//finally the search request is sent to Solr via our searchEngine service with promise
	searchEngine.getSearchResults(searchUrl).then(function(data){
		//reset the fq array first otherwise it will grow bigger and bigger
		$scope.fq=null;
		//fetch data from the responded Json. 
		$scope.numFound = data.response.numFound * 1;
		$scope.from = data.response.start * 1;
		$scope.rows = data.responseHeader.params.rows * 1;
		$scope.to = (($scope.from + $scope.rows) <= $scope.numFound)? ($scope.from + $scope.rows) : $scope.numFound;
		//'from' correction
		$scope.from = ($scope.numFound == 0)? 0 : $scope.from + 1;
		$scope.success = ($scope.numFound > 0)? true : false;		
		$scope.results = data.response.docs;
		// map the templates to the types - each result will get a template according to it's type
		tmplMapping($scope.results);		
		$scope.highLighting = data.highlighting;
		$scope.fq = data.responseHeader.params.fq;		
		$scope.searchDone = ($scope.searchTerm.length >= 2 || $scope.fq.length > 2)? true : false;
		$scope.suggestions = (data.spellcheck && data.spellcheck.suggestions.length > 0) ? data.spellcheck.suggestions[1].suggestion : '';
			
		if(full){
	//Facets: if full search all facets will be filled up again
		//Recent changes			
		if(typeof(data.facet_counts.facet_queries) != 'undefined'){	
			recentFacet.setResponseFq($scope.fq);
			recentFacet.setMapping($scope.timeMap);
			recentFacet.fillWithJson(data.facet_counts.facet_queries);
			$scope.recent = recentFacet.getItems();
			$scope.recentSlides = recentFacet.getItemsInSlides(10);
		}else{
			recentFacet.items.length=0;
		}
		//Media Facet		
			mediaFacet.setResponseFq($scope.fq);
		if(data.facet_counts.facet_fields.type.length > 0){	
			mediaFacet.fillWithArray(data.facet_counts.facet_fields.type);
			$scope.media = mediaFacet.getItems();
			$scope.mediaSlides = mediaFacet.getItemsInSlides(10);
		}else{
			mediaFacet.items.length=0;
		}
		//Language Facet	-> not in use	
		/* 	langFacet.setResponseFq($scope.fq);
		if(data.facet_counts.facet_fields.language.length > 0){	
			langFacet.fillWithArray(data.facet_counts.facet_fields.language);
			$scope.lang = langFacet.getItems();
			$scope.langSlides = langFacet.getItemsInSlides(10);
		}else{
			langFacet.items.length=0;
		} */
		//Web Facet					
			webFacet.setResponseFq($scope.fq);
		if(data.facet_counts.facet_fields.web.length > 0){						
			webFacet.fillWithArray(data.facet_counts.facet_fields.web);
			$scope.web = webFacet.getItems();
			$scope.webSlides = webFacet.getItemsInSlides(10);
		}else{
			webFacet.items.length=0;
		}
		//Topic Type Facet			
			topicTypeFacet.setResponseFq($scope.fq);
		if(data.facet_counts.facet_fields.field_TopicType_lst.length > 0){		
			topicTypeFacet.fillWithArray(data.facet_counts.facet_fields.field_TopicType_lst);			
			$scope.tType = topicTypeFacet.getItems();
			$scope.topicSlides = topicTypeFacet.getItemsInSlides(10);
		}else{
			topicTypeFacet.items.length=0;
		}		
		//Author Facet				
			authorFacet.setResponseFq($scope.fq);
		if(data.facet_counts.facet_fields.author.length > 0){	
			authorFacet.fillWithArray(data.facet_counts.facet_fields.author);
			$scope.author = authorFacet.getItems();
			$scope.authorSlides = authorFacet.getItemsInSlides(10);
		}else{
			authorFacet.items.length=0;
		}
		
		//display them according to visualisation rules		
		$scope.mediaStyle = (mediaFacet.isVisible())? "display: block; height:93%;" : "display: none;";
		$scope.webStyle = (webFacet.isVisible())? "display: block;" : "display: none;";
		$scope.recentStyle = (recentFacet.isVisible())? "display: block;" : "display: none;";
		//$scope.langStyle = (langFacet.isVisible())? "display: block;" : "display: none;";
		$scope.tTypeStyle = (topicTypeFacet.isVisible())? "display: block;" : "display: none;";
		$scope.authorStyle = (authorFacet.isVisible())? "display: block;": "display: none;";
		
		//Fill "your selection" array with the checked items analysed from responseHeader:params:fq 
		var yourSelection = new Array();
		if($scope.searchTerm.length > 0){
			yourSelection.push({"id":"searchTerm", "sysname":"searchTerm", "name":"keyword", "checked":true, "selection":$scope.searchTerm});
		}
		if(webFacet.getCheckedItems().length > 0){
			yourSelection.push({"id":"web", "sysname":"webFacet", "name":"web", "checked":true, "selection":getYourSelectionItem(webFacet.getCheckedItems())});			
		}
		if(mediaFacet.getCheckedItems().length > 0){
			yourSelection.push({"id":"type", "sysname":"mediaFacet", "name":"media", "checked":true, "selection":getYourSelectionItem(mediaFacet.getCheckedItems())});
		}
		if(recentFacet.getCheckedItems().length > 0){
			yourSelection.push({"id":"date", "sysname":"recentFacet", "name":"recent", "checked":true, "selection":getYourSelectionItem(recentFacet.getCheckedItems())});
		}
		if(topicTypeFacet.getCheckedItems().length > 0){
			yourSelection.push({"id":"field_TopicType_lst", "sysname":"topicTypeFacet", "name":"topic type", "checked":true, "selection":getYourSelectionItem(topicTypeFacet.getCheckedItems())});
		}
		if(authorFacet.getCheckedItems().length > 0){
			yourSelection.push({"id":"author", "sysname":"authorFacet", "name":"author", "checked":true, "selection":getYourSelectionItem(authorFacet.getCheckedItems())});
		}		
		$scope.yourSelection = yourSelection;		
		}
	})};
	$scope.search('init');
	
/**
Some helper functions
*/
	
	/**
	puts the selected items of a facet in a readable string to show it as "Your Selection"
	@param facetCheckedItems (Json Object)
	the checked items from a facet
	@return
	a readable string - comma separated strings if multiple choice or just one item's name. 
	*/
	function getYourSelectionItem(facetCheckedItems){
		var itemString = '';
		for(var i=0; i<facetCheckedItems.length; i++){
			itemString+=facetCheckedItems[i] + ', ';
		}
		return itemString.substring(0, itemString.length-2);	
	}
	
	/**
	According to the type of the result a certain template is assigend
	@param docs (Json Object)
	search results in a Json Object
	@return void
	*/
	function tmplMapping(docs){
		docs.forEach(function setTmpl(item){
			switch (item.type){
				case 'topic':
					item['tmpl'] = 'topic';
					break;
				case 'jpg' || 'png' || 'gif' :
					item['tmpl'] = 'image';
					break;
				default:
					item['tmpl'] = 'topic';
				break;			
			}
		});
	}
	
	/**
	Initialisation of the filters and maps for the different facets
	*/
	function initFilternMaps(){	
			$scope.webMap = {
		 "ABE": "WebHome Abteilung Beschleuniger und Entwicklung (ABE)",
		"ADOS": "ADOS",
		"AFD": "Willkommen im AFD Intranet",
		"AIE": "AIE",
		"AIT": "AIT",
		"AIT/Controls": "Controls",
		"AIT/Foswiki_Maintenance": "Foswiki_Maintenance",
		"AIT/Rackliste": "Rackliste",
		"AIT/Swissfel": "Controls - AIT Web for Swissfel",
		"AKO": "Abteilung Kommunikation (AKO)",
		"AMAS": "AMAS",
		"AMI_Kundenzufriedenheit": "AMI_Kundenzufriedenheit",
		"ASI": "Abteilung Strahlenschutz und Sicherheit",
		"AUTHOR_WWW": "AUTHOR_WWW",
		"AUTHOR_WWW/ABE": "AUTHOR_WWW/ABE",
		"AUTHOR_WWW/ABK_Diagnostics": "ABK_Diagnostics",
		"AUTHOR_WWW/ACSM": "ACSM",
		"AUTHOR_WWW/AIT": "AIT",
		"AUTHOR_WWW/AKO": "AUTHOR_WWW/AKO",
		"AUTHOR_WWW/AMAS": "AMAS",
		"AUTHOR_WWW/AMG": "AMG",
		"AUTHOR_WWW/AMI": "AMI",
		"AUTHOR_WWW/ASI": "ASI",
		"AUTHOR_WWW/ASQ": "ASQ",
		"AUTHOR_WWW/ATK": "ATK",
		"AUTHOR_WWW/Advanced_Instrumentation": "Advanced_Instrumentation",
		"AUTHOR_WWW/BAB": "BAB",
		"AUTHOR_WWW/BIO": "BIO",
		"AUTHOR_WWW/Bildungszentrum": "Bildungszentrum",
		"AUTHOR_WWW/CATCOS": "CATCOS",
		"AUTHOR_WWW/CCEM": "CCEM",
		"AUTHOR_WWW/CEG": "CEG",
		"AUTHOR_WWW/CMT": "CMT",
		"AUTHOR_WWW/CPE": "CPE",
		"AUTHOR_WWW/CPM": "CPM",
		"AUTHOR_WWW/CRL": "CRL",
		"AUTHOR_WWW/Chancengleichheit": "Chancengleichheit",
		"AUTHOR_WWW/Dummy_Bereich": "Dummy_Bereich",
		"AUTHOR_WWW/ENE": "AUTHOR_WWW/ENE",
		"AUTHOR_WWW/ERC_MULTIAX": "ERC_MULTIAX",
		"AUTHOR_WWW/Enefficient": "Enefficient",
		"AUTHOR_WWW/Energiespiegel": "Energiespiegel",
		"AUTHOR_WWW/Events": "Events",
		"AUTHOR_WWW/GFA": "AUTHOR_WWW/GFA",
		"AUTHOR_WWW/Gastronomie": "Gastronomie",
		"AUTHOR_WWW/Gems": "Gems",
		"AUTHOR_WWW/IEA": "IEA",
		"AUTHOR_WWW/ILAB": "AUTHOR_WWW/ILAB",
		"AUTHOR_WWW/I_Tree": "I_Tree",
		"AUTHOR_WWW/Info": "AUTHOR_WWW/Info",
		"AUTHOR_WWW/LAC": "LAC",
		"AUTHOR_WWW/LBK": "LBK",
		"AUTHOR_WWW/LBR": "LBR",
		"AUTHOR_WWW/LCH": "AUTHOR_WWW/LCH",
		"AUTHOR_WWW/LDM": "LDM",
		"AUTHOR_WWW/LDM/Electronics": "Electronics",
		"AUTHOR_WWW/LDM/Mechanics": "Mechanics",
		"AUTHOR_WWW/LDM/NO_COMPUTING": "AUTHOR_WWW/LDM/NO_COMPUTING",
		"AUTHOR_WWW/LDM/SEPT": "SEPT",
		"AUTHOR_WWW/LDM/SSC": "SSC",
		"AUTHOR_WWW/LEA": "AUTHOR_WWW/LEA",
		"AUTHOR_WWW/LEA_EEM": "LEA_EEM",
		"AUTHOR_WWW/LEA_RHR": "LEA_RHR",
		"AUTHOR_WWW/LEC": "LEC",
		"AUTHOR_WWW/LES": "AUTHOR_WWW/LES",
		"AUTHOR_WWW/LMN": "LMN",
		"AUTHOR_WWW/LMU": "LMU",
		"AUTHOR_WWW/LMU_LEM": "LMU_LEM",
		"AUTHOR_WWW/LMU_MSR": "LMU_MSR",
		"AUTHOR_WWW/LNS": "LNS",
		"AUTHOR_WWW/LSB": "LSB",
		"AUTHOR_WWW/LSB/Detectors": "Detectors",
		"AUTHOR_WWW/LSB/Insertion_Devices": "Insertion_Devices",
		"AUTHOR_WWW/LSB/MX": "MX",
		"AUTHOR_WWW/LSB/Tomography": "Tomography",
		"AUTHOR_WWW/LSB/Xray": "Xray",
		"AUTHOR_WWW/LSC": "LSC",
		"AUTHOR_WWW/LSC_FEMTO": "LSC_FEMTO",
		"AUTHOR_WWW/LSC_INFRARED": "LSC_INFRARED",
		"AUTHOR_WWW/LSK": "LSK",
		"AUTHOR_WWW/LST": "AUTHOR_WWW/LST",
		"AUTHOR_WWW/LTH": "LTH",
		"AUTHOR_WWW/LTH_Experiment": "AUTHOR_WWW/LTH_Experiment",
		"AUTHOR_WWW/LTP": "LTP",
		"AUTHOR_WWW/MSS": "MSS",
		"AUTHOR_WWW/Materials": "AUTHOR_WWW/Materials",
		"AUTHOR_WWW/Megapie": "Megapie",
		"AUTHOR_WWW/Mu3e": "Mu3e",
		"AUTHOR_WWW/Muse": "Muse",
		"AUTHOR_WWW/NES": "NES",
		"AUTHOR_WWW/NIS": "NIS",
		"AUTHOR_WWW/NUM": "NUM",
		"AUTHOR_WWW/OPTIWARES": "OPTIWARES",
		"AUTHOR_WWW/PA": "PA",
		"AUTHOR_WWW/PSI2013": "PSI2013",
		"AUTHOR_WWW/PSIWeb": "PSIWeb",
		"AUTHOR_WWW/PSI_Fellow": "PSI_Fellow",
		"AUTHOR_WWW/PSI_Impuls": "PSI_Impuls",
		"AUTHOR_WWW/PSI_forum": "PSI_forum",
		"AUTHOR_WWW/Proscan": "Proscan",
		"AUTHOR_WWW/RAG": "AUTHOR_WWW/RAG",
		"AUTHOR_WWW/Root": "Root",
		"AUTHOR_WWW/SF_Baustelleninfo": "AUTHOR_WWW/SF_Baustelleninfo",
		"AUTHOR_WWW/SLS": "SLS",
		"AUTHOR_WWW/SLS/ADRESS": "ADRESS",
		"AUTHOR_WWW/SLS/CSAXS": "CSAXS",
		"AUTHOR_WWW/SLS/IR": "IR",
		"AUTHOR_WWW/SLS/MS": "MS",
		"AUTHOR_WWW/SLS/Micro_XAS": "Micro_XAS",
		"AUTHOR_WWW/SLS/Optics": "Optics",
		"AUTHOR_WWW/SLS/POLLUX": "POLLUX",
		"AUTHOR_WWW/SLS/PXI": "PXI",
		"AUTHOR_WWW/SLS/PXII": "PXII",
		"AUTHOR_WWW/SLS/PXIII": "PXIII",
		"AUTHOR_WWW/SLS/Phoenix": "Phoenix",
		"AUTHOR_WWW/SLS/SIM": "SIM",
		"AUTHOR_WWW/SLS/SIS": "SIS",
		"AUTHOR_WWW/SLS/Super_XAS": "Super_XAS",
		"AUTHOR_WWW/SLS/TOMCAT": "TOMCAT",
		"AUTHOR_WWW/SLS/VUV": "VUV",
		"AUTHOR_WWW/SLS/XIL": "XIL",
		"AUTHOR_WWW/SLSTTAG": "SLSTTAG",
		"AUTHOR_WWW/SMUS": "SMUS",
		"AUTHOR_WWW/SYN": "SYN",
		"AUTHOR_WWW/Sandbox": "Sandbox",
		"AUTHOR_WWW/Science": "Science",
		"AUTHOR_WWW/Swiss_Fel": "Swiss_Fel",
		"AUTHOR_WWW/TA_Group": "TA_Group",
		"AUTHOR_WWW/Techtransfer": "Techtransfer",
		"AUTHOR_WWW/User": "User",
		"AUTHOR_WWW/WS_4DTreatment": "WS_4DTreatment",
		"AUTHOR_WWW/Winterschool": "AUTHOR_WWW/Winterschool",
		"AUTHOR_WWW/ZRW": "ZRW",
		"Applications": "Applications",
		"Applications/AIT": "AIT",
		"Applications/Alfresco": "Alfresco",
		"Applications/ClassificationApp": "ClassificationApp",
		"Applications/FAQ": "FAQ",
		"Applications/Forms": "Forms",
		"Applications/IdokInterface": "IdokInterface",
		"Applications/MeetingApp": "MeetingApp",
		"Applications/PSI": "PSI",
		"Applications/PSIWeb": "PSIWeb",
		"Applications/PSIWiki": "PSIWiki",
		"Applications/Projects": "Projects",
		"Applications/Tasks": "Tasks",
		"BIKO": "BIKO",
		"Besucherteam": "Besucherteam",
		"Bibliothek": "Bibliothek",
		"CFD": "Computational Fluid Dynamic (CFD) page",
		"CMSPhysics": "CMSPhysics",
		"CPT": "CPT",
		"CXS_Coord": "CXS_Coord",
		"Chancengleichheit": "Chancengleichheit",
		"Computing": "Computing Intranet and IT Services",
		"Computing/KB": "Computing/KB",
		"Computing/News": "News",
		"Controls": "Controls",
		"Controls_IT": "Controls_IT",
		"DIR": "DIR",
		"DUO": "DUO",
		"ENE": "Willkommen im ENE Intranet",
		"El_Net": "PSI Elektronik Netzwerk",
		"GFA": "GFA",
		"Gasmix": "Gasmix",
		"HIPA": "WebHome HIPA",
		"Hydrothermal": "Hydrothermal",
		"IGB": "ICT Governance Board IGB",
		"ILAB": "Hauptseite",
		"Kino": "Kino / Cinema",
		"Knowledge_Forum": "Knowledge Forum",
		"Ktrans": "Ktrans",
		"LCH": "Labor für Radio- und Umweltchemie (LCH)",
		"LLRF": "LLRF",
		"LMU": "LMU Intranet",
		"LNM": "LNM",
		"LNS": "LNS",
		"LOG": "LOG",
		"LTP_Electronics": "Electronics & Measuring Systems",
		"Labview": "Labview",
		"MMGroup": "MMGroup",
		"MPM": "MPM",
		"MSBL": "Materials Science Beamline X04SA",
		"MUSR": "MUSR",
		"MXGroup": "MXGroup",
		"Magnets": "Magnets",
		"Main": "Main",
		"Main/Interflex": "Interflex",
		"Materials": "Materials",
		"MentorGraphics": "Mentor Graphics - PSI",
		"Micro_XAS": "Micro_XAS",
		"Music": "PSI Music club",
		"NIAG": "NIAG Intranet",
		"NSS7": "NSS7",
		"Nano_XAS": "Nano_XAS",
		"OMNY": "OMNY",
		"Optics": "Optics",
		"PA": "Personalmanagement",
		"PEARL": "PEARL",
		"POLLUX": "POLLUX",
		"PSI": "Willkommen im PSI Intranet",
		"PSI/AZ": "AZ",
		"PSI/Glossar": "Glossar",
		"PSI/People": "People",
		"PSI2": "Willkommen im PSI Intranet",
		"PSI2/AZ": "AZ",
		"PSI2/Glossar": "Glossar",
		"PSI2/People": "People",
		"PSIWeb": "PSIWeb",
		"PSIWeb/Hosting": "Hosting",
		"PSIWeb/Intern": "Intern",
		"PSIWeb2106": "PSIWeb2106",
		"PSI_HPC": "PSI_HPC",
		"PSI_fellow": "PSI_fellow",
		"Proscan": "Proscan",
		"Psiprojects": "PSI Project Portal",
		"RF": "RF",
		"RXPD": "RXPD",
		"SDC": "SDC",
		"SLS": "SLS",
		"SLS_Detector_Group": "SLS_Detector_Group",
		"SLS_Operation": "SLS_Operation",
		"SLS_Science_Coord": "SLS Science Coordination Web",
		"SLS_Tech_Coord": "SLS_Tech_Coord",
		"STARS": "STARSWiki",
		"SYNTRONICS": "SYNTRONICS",
		"SYN_Secretariat": "SYN_Secretariat",
		"Sandbox": "Sandbox",
		"Sandbox_D1": "Sandbox_D1",
		"Sandbox_D1/News": "News",
		"Sandbox_D1/Request": "Request",
		"Secretary": "Sekretariate am PSI",
		"SwProjects": "SwProjects",
		"Swiss_FEL": "Swiss_FEL",
		"Swiss_FEL/Intern": "Intern",
		"System": "System",
		"System115": "System115",
		"System115_build": "System115_build",
		"System115_skin": "System115_skin",
		"System115x": "System115x",
		"Techtransfer": "Techtransfer",
		"Techtransfer/Intern": "Intern",
		"XAS": "XAS",
		"Yoga": "Yoga",
		  "Filed in": "Filed in ",
		  "Tagged": "Tagged ",
		  "tagged": "tagged ",
		  "field_TopicType_lst": "topic type",
		  "type": "media",
		  "date": "recently",
		  "en": "English",
		  "de": "German",
		  "language": "language",
		  "keyword": "keyword",
		  "tag": "tag"
		}	

		$scope.timeMap = {
				"1 hour":"[NOW-1HOUR TO NOW]", 
				"4 hours":"[NOW-4HOUR TO NOW]",
				"today":"[NOW/DAY TO NOW]",
				"2 days":"[NOW/DAY-1DAY TO NOW]",
				"7 days":"[NOW/DAY-7DAY TO NOW]",
				"1 month":"[NOW-1MONTH TO NOW]",
				"2 months":"[NOW-2MONTH TO NOW]",
				"1 year":"[NOW-1YEAR TO NOW]",
				"older":"[* TO NOW/YEAR]"
			 }
		$scope.topicTypeFilter = ['ApplicationLicense', 'ApplicationTopic', 'DataForm', 'DocuTopic', 'TopicFunction', 'TopicStub', 'TopicTemplate', 'TopicType', 'TopicView', 'WebTool', 'WikiApplication', 'WikiTopic', 'TaggedTopic', 'CategorizedTopic'];

		$scope.authorFilter = ['UnknownUser', 'AdminUser', 'RegistrationAgent', 'AdminGroup', 'WikiGuest', 'FoswikiContributor', 'ProjectContributor', 'TestUser'];
	}	
}]);

