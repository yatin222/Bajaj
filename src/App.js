import { Routes, Route } from "react-router-dom";
import { Home} from "./pages/Home";
import { Login } from "./pages/Login"; 
import { Signin } from "./pages/Signin";
// import { Exercise } from "./pages/Excerise";
import { Press } from "./pages/Press";
import { Squats } from "./pages/Squats";
import { Curl } from "./pages/Curl";
import { About } from "./pages/About";
import { Account } from "./pages/Account";

function App() {
  return (
      <div className="App ">
        <Routes> 
          <Route path="/" element={<Login/>} /> 
          <Route path="/account" element ={<Account/>}/>
          <Route path="/home" element={<Home/>} /> 
          <Route path="/login" element={<Login />} /> 
          <Route path="/signup" element={<Signin />} /> 
          <Route path="/Press" element={<Press />} /> 
          <Route path="/Squat" element={<Squats />} />
          <Route path="/Curl" element={<Curl />} />
          <Route path="/aboutus" element={<About/>}></Route> 
        </Routes>
      </div>
  );
}

export default App;
