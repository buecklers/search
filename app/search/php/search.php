<?php
include 'include/wiki_session.php';
include '../config/config.php';


//$request ='http://solrsearch.intranet.psi.ch/solr/foswiki/select?q=abfall&wt=xml&indent=true';
$searchUrl = 'http://solrsearch.intranet.psi.ch/solr/foswiki/select';
//$searchUrl = 'http://vasprd01:81/solr/foswiki/select';
//WikiUser abholen
try{
$auth = new Authentication();
$user = $auth->getWikiUser();
//$log->info('searcher identified as: '.$user);
$loginfouserdebug = ($user=='anonymous' || $user==' ')? 'searcher anonymous' : 'searcher identified as '.$user;
$loginfouser = ($user=='anonymous' || $user==' ')? 'searcher anonymous' : 'searcher identified';
}catch(Exception $e){
$log->error('searcher cold not be identified: '.$e);
}

$queryString = $_SERVER['QUERY_STRING'];

$authQuery = ($user=='anonymous' || $user==' ')? ('&fq='.urlencode('access_granted:all')) : ('&fq='.urlencode('access_granted:'.$user.' OR access_granted:all'));


$searchUrl .= '?'.$queryString.$authQuery;

header('Content-Type: application/json');
echo file_get_contents($searchUrl);

//$append =  $log->getAppender('myFileAppender');
$jsonResponse = json_decode(file_get_contents($searchUrl));
$fqparams = '';
$page = '';
$success = 'no results';
while(list($key, $val)=each($jsonResponse->{'responseHeader'}->{'params'}->{'fq'})){
	$k = split(':',$val);
	if($k[0]!='access_granted' && trim($k[0])!='-web_search'){
		$fqparams.=preg_replace('(\{.*\})','',$k[0]).':'.$k[1].', ';
	}
}
if(isset($jsonResponse->{'responseHeader'}->{'params'}->{'start'}) && $jsonResponse->{'responseHeader'}->{'params'}->{'start'} > 0){
	$page = 'page turned';
}
if($jsonResponse->{'response'}->{'numFound'} > 0){
	$success = $jsonResponse->{'response'}->{'numFound'}.' results';
}

//$fqparams = preg_replace('(\{.{3,25}\})', ' ', $fqparams);
$fqparams.='q='.$jsonResponse->{'responseHeader'}->{'params'}->{'q'};
$log->debug($loginfouserdebug);
$log->info($loginfouser.' --- respT: '.$jsonResponse->{'responseHeader'}->{'QTime'}.'ms, '.$success.', '.$fqparams.', '.$page);
?>