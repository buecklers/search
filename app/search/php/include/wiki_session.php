<?php


class Authentication 
{

	private $user = "guest";
	private $wikiUser = "anonymous"; //default wikiUser; user if no authentication is done
	private $userList = "../data/usermapping.json";
	

	
	public function setUserlist($list){
		$this->userList = $list;
	} 
	
	public function getWikiUser(){
		global $log;
		//User aus Cookie lesen
		if (isset($_COOKIE['SFOSWIKISID'])) {
			if (file_exists('/afs/psi.ch/service/wiki/psiwiki/working/tmp/cgisess_' .  $_COOKIE['SFOSWIKISID'])) {
				$session = file_get_contents ('/afs/psi.ch/service/wiki/psiwiki/working/tmp/cgisess_' .  $_COOKIE['SFOSWIKISID']);
				preg_match("/AUTHUSER' =\> '(.*?)'/", $session, $treffer);
				if (isset($treffer[1]))
					$this->user = $treffer[1];
			}
		}
		//wikiuser aus liste holen
		
		if (file_exists($this->userList)){		
			$JsonFile = file_get_contents($this->userList, 10000);
		}else{
			$log->error('user list not found');
		}
		
		//$log->info('Json user eingelesen');
		$Json = json_decode($JsonFile);	
		if ($this->user != 'guest' && $Json->{$this->user} != ''){
			$this->wikiUser = $Json->{$this->user};
		}else{
			$log->error('unknown wikiuser');
		}
		return $this->wikiUser;
	} 
}
?>